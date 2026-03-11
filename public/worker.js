// Transformers.js loaded from CDN — only ~1MB, cached after first load
// The actual Whisper model (~40MB) is cached in IndexedDB by the browser
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

async function getTranscriber(progress_callback) {
    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
            quantized: true,
            progress_callback,
        });
    }
    return transcriber;
}

self.addEventListener('message', async (e) => {
    const { type, audio, lang } = e.data;

    if (type === 'load') {
        try {
            self.postMessage({ status: 'loading' });
            await getTranscriber(x => {
                if (x.status === 'progress') {
                    self.postMessage({ status: 'progress', progress: x });
                }
            });
            self.postMessage({ status: 'ready' });
        } catch (err) {
            self.postMessage({ status: 'error', error: String(err) });
        }
    }

    if (type === 'transcribe') {
        try {
            const t = await getTranscriber(null);
            const language = lang === 'hi' ? 'hindi' : 'english';
            const result = await t(audio, {
                language,
                task: 'transcribe',
                // Raise the bar so fan noise / silence is rejected rather than hallucinated
                no_speech_threshold: 0.6,
                condition_on_previous_text: false,
            });

            // Strip Whisper sound annotations: (audience laughing), [Music], [BLANK_AUDIO], etc.
            let text = result.text || '';
            text = text.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

            // Discard if nothing real remains
            const stripped = text.replace(/[^\w]/g, '').trim();
            if (stripped.length < 2) return;

            // Rolling window: if accumulated text has >12 words, start fresh with new chunk
            self.postMessage({ status: 'complete', text, replace: true });
        } catch (err) {
            self.postMessage({ status: 'error', error: String(err) });
        }
    }
});
