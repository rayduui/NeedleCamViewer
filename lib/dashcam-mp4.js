/**
 * Tesla Dashcam MP4 Parser
 * Parses MP4 files and extracts SEI metadata from Tesla dashcam footage.
 */
import * as protobuf from 'protobufjs';

export class DashcamMP4 {
    constructor(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this._config = null;
    }

    // -------------------------------------------------------------
    // MP4 Box Navigation
    // -------------------------------------------------------------

    /** Find a box by name within a range */
    findBox(start, end, name) {
        for (let pos = start; pos + 8 <= end;) {
            let size = this.view.getUint32(pos);
            const type = this.readAscii(pos + 4, 4);
            const headerSize = size === 1 ? 16 : 8;

            if (size === 1) {
                const high = this.view.getUint32(pos + 8);
                const low = this.view.getUint32(pos + 12);
                size = Number((BigInt(high) << 32n) | BigInt(low));
            } else if (size === 0) {
                size = end - pos;
            }

            if (type === name) {
                return { start: pos + headerSize, end: pos + size, size: size - headerSize };
            }
            pos += size;
        }
        throw new Error(`Box "${name}" not found`);
    }

    /** Find mdat box and return content location */
    findMdat() {
        const mdat = this.findBox(0, this.view.byteLength, 'mdat');
        return { offset: mdat.start, size: mdat.size };
    }

    // -------------------------------------------------------------
    // Video Configuration
    // -------------------------------------------------------------

    /** Get video configuration (lazy-loaded) */
    getConfig() {
        if (this._config) return this._config;

        const moov = this.findBox(0, this.view.byteLength, 'moov');
        const trak = this.findBox(moov.start, moov.end, 'trak');
        const mdia = this.findBox(trak.start, trak.end, 'mdia');
        const minf = this.findBox(mdia.start, mdia.end, 'minf');
        const stbl = this.findBox(minf.start, minf.end, 'stbl');
        const stsd = this.findBox(stbl.start, stbl.end, 'stsd');
        const avc1 = this.findBox(stsd.start + 8, stsd.end, 'avc1');
        const avcC = this.findBox(avc1.start + 78, avc1.end, 'avcC');

        const o = avcC.start;
        const codec = `avc1.${this.hex(this.view.getUint8(o + 1))}${this.hex(this.view.getUint8(o + 2))}${this.hex(this.view.getUint8(o + 3))}`;

        // Extract SPS/PPS
        let p = o + 6;
        const spsLen = this.view.getUint16(p);
        const sps = new Uint8Array(this.buffer.slice(p + 2, p + 2 + spsLen));
        p += 2 + spsLen + 1;
        const ppsLen = this.view.getUint16(p);
        const pps = new Uint8Array(this.buffer.slice(p + 2, p + 2 + ppsLen));

        // Get timescale from mdhd (ticks per second, used to convert stts deltas to ms)
        const mdhd = this.findBox(mdia.start, mdia.end, 'mdhd');
        const mdhdVersion = this.view.getUint8(mdhd.start);
        const timescale = mdhdVersion === 1
            ? this.view.getUint32(mdhd.start + 20)
            : this.view.getUint32(mdhd.start + 12);

        // Get frame durations from stts (delta ticks per frame -> converted to ms)
        const stts = this.findBox(stbl.start, stbl.end, 'stts');
        const entryCount = this.view.getUint32(stts.start + 4);
        const durations = [];
        let pos = stts.start + 8;
        for (let i = 0; i < entryCount; i++) {
            const count = this.view.getUint32(pos);
            const delta = this.view.getUint32(pos + 4);
            const ms = (delta / timescale) * 1000;
            for (let j = 0; j < count; j++) durations.push(ms);
            pos += 8;
        }

        this._config = {
            width: this.view.getUint16(avc1.start + 24),
            height: this.view.getUint16(avc1.start + 26),
            codec, sps, pps, timescale, durations
        };
        return this._config;
    }

    // -------------------------------------------------------------
    // SEI Extraction
    // -------------------------------------------------------------

    /** Extract all SEI messages for telemetry data */
    extractSeiMessages(SeiMetadata) {
        try {
            const mdat = this.findMdat();
            console.log('[MP4] Found mdat box at offset:', mdat.offset, 'size:', mdat.size);
            
            const messages = [];
            let cursor = mdat.offset;
            const end = mdat.offset + mdat.size;
            let nalCount = 0;
            let seiCount = 0;

            while (cursor + 4 <= end) {
                const nalSize = this.view.getUint32(cursor);
                cursor += 4;

                if (nalSize < 2 || cursor + nalSize > this.view.byteLength) {
                    cursor += Math.max(nalSize, 0);
                    continue;
                }

                nalCount++;
                const nalType = this.view.getUint8(cursor) & 0x1F;
                
                // NAL type 6 = SEI, payload type 5 = user data unregistered
                if (nalType === 6) {
                    seiCount++;
                    const payloadType = this.view.getUint8(cursor + 1);
                    
                    if (payloadType === 5) {
                        const sei = this.decodeSei(new Uint8Array(this.buffer.slice(cursor, cursor + nalSize)), SeiMetadata);
                        if (sei) {
                            messages.push(sei);
                        }
                    }
                }
                cursor += nalSize;
            }
            
            console.log('[MP4] Scanned', nalCount, 'NAL units, found', seiCount, 'SEI units, decoded', messages.length, 'SEI messages');
            return messages;
        } catch (error) {
            console.error('[MP4] Error extracting SEI messages:', error);
            throw error;
        }
    }

    /** Decode SEI NAL unit to protobuf message */
    decodeSei(nal, SeiMetadata) {
        if (!SeiMetadata || nal.length < 4) {
            if (!SeiMetadata) console.warn('[MP4] SeiMetadata not provided to decodeSei');
            return null;
        }

        let i = 3;
        while (i < nal.length && nal[i] === 0x42) i++;
        if (i <= 3 || i + 1 >= nal.length || nal[i] !== 0x69) {
            // This is normal - not all SEI NAL units are Tesla SEI
            return null;
        }

        try {
            const decoded = SeiMetadata.decode(this.stripEmulationBytes(nal.subarray(i + 1, nal.length - 1)));
            return decoded;
        } catch (e) {
            console.warn('[MP4] Failed to decode SEI protobuf:', e.message);
            return null;
        }
    }

    /** Strip H.264 emulation prevention bytes */
    stripEmulationBytes(data) {
        const out = [];
        let zeros = 0;
        for (const byte of data) {
            if (zeros >= 2 && byte === 0x03) { zeros = 0; continue; }
            out.push(byte);
            zeros = byte === 0 ? zeros + 1 : 0;
        }
        return Uint8Array.from(out);
    }

    // -------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------

    readAscii(start, len) {
        let s = '';
        for (let i = 0; i < len; i++) s += String.fromCharCode(this.view.getUint8(start + i));
        return s;
    }

    hex(n) { return n.toString(16).padStart(2, '0'); }

    /** Concatenate Uint8Arrays */
    static concat(...arrays) {
        const result = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
        let offset = 0;
        for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
        return result;
    }
}

// -------------------------------------------------------------
// Tesla Dashcam Helpers
// Protobuf initialization and utilities
// -------------------------------------------------------------

let SeiMetadata = null;
let enumFields = null;

/** Initialize protobuf by loading the .proto file */
export async function initProtobuf() {
    if (SeiMetadata) {
        console.log('[Protobuf] Already initialized');
        return { SeiMetadata, enumFields };
    }

    try {
        console.log('[Protobuf] Initializing protobuf...');
        console.log('[Protobuf] protobufjs loaded');
        
        const response = await fetch('/dashcam.proto');
        if (!response.ok) {
            throw new Error(`Failed to fetch dashcam.proto: ${response.status} ${response.statusText}`);
        }
        
        const protoText = await response.text();
        console.log('[Protobuf] dashcam.proto loaded, length:', protoText.length);
        
        const root = protobuf.parse(protoText).root;
        console.log('[Protobuf] Proto parsed successfully');
        
        SeiMetadata = root.lookupType('SeiMetadata');
        console.log('[Protobuf] SeiMetadata type found');
        
        enumFields = {
            gearState: SeiMetadata.lookup('Gear'),
            autopilotState: SeiMetadata.lookup('AutopilotState'),
            gear_state: SeiMetadata.lookup('Gear'),
            autopilot_state: SeiMetadata.lookup('AutopilotState')
        };
        
        console.log('[Protobuf] Initialization complete');
        return { SeiMetadata, enumFields };
    } catch (error) {
        console.error('[Protobuf] Failed to initialize:', error);
        throw error;
    }
}

export function getProtobuf() {
    return SeiMetadata ? { SeiMetadata, enumFields } : null;
}

/** Format SEI metadata for display */
export function formatSeiData(sei, debug = false) {
    if (!sei) return null;
    
    // Debug first SEI message to see what fields are available
    if (debug) {
        console.log('[FormatSEI] Raw SEI message:', sei);
        console.log('[FormatSEI] Available fields:', Object.keys(sei));
    }
    
    // Protobuf returns camelCase field names, not snake_case!
    // Convert m/s to mph (1 m/s = 2.23694 mph)
    const speedMph = (sei.vehicleSpeedMps || sei.vehicle_speed_mps || 0) * 2.23694;
    
    // Convert accelerator position (0-100) to percentage - already in percentage!
    const throttle = sei.acceleratorPedalPosition || sei.accelerator_pedal_position || 0;
    
    // Brake is a boolean, convert to percentage for UI consistency
    const braking = (sei.brakeApplied || sei.brake_applied) ? 100 : 0;
    
    // Get autopilot state
    let autopilotActive = false;
    let autopilotState = 'NONE';
    const autopilotValue = sei.autopilotState ?? sei.autopilot_state;
    if (autopilotValue !== undefined && autopilotValue !== 0) {
        autopilotActive = true;
        const states = ['NONE', 'SELF_DRIVING', 'AUTOSTEER', 'TACC'];
        autopilotState = states[autopilotValue] || 'NONE';
    }
    
    const formatted = {
        speed: speedMph,
        throttle,
        braking,
        leftSignal: sei.blinkerOnLeft || sei.blinker_on_left || false,
        rightSignal: sei.blinkerOnRight || sei.blinker_on_right || false,
        autopilotActive,
        autopilotState,
        latitude: sei.latitudeDeg ?? sei.latitude_deg,
        longitude: sei.longitudeDeg ?? sei.longitude_deg,
        heading: sei.headingDeg ?? sei.heading_deg,
        steeringAngle: sei.steeringWheelAngle ?? sei.steering_wheel_angle,
        gearState: sei.gearState ?? sei.gear_state,
        frameSeqNo: sei.frameSeqNo ?? sei.frame_seq_no,
        // Raw SEI data for advanced display
        raw: sei
    };
    
    if (debug) {
        console.log('[FormatSEI] Formatted telemetry:', formatted);
    }
    
    return formatted;
}
