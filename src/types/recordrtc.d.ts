declare module 'recordrtc' {
    export default class RecordRTC {
        constructor(stream: MediaStream, options?: any);
        startRecording(): void;
        stopRecording(callback: () => void): void;
        destroyRecorder(): void;
        static StereoAudioRecorder: any;
        getBlob(): Blob;
        getDataURL(callback: (dataURL: string) => void): void;
    }
}
