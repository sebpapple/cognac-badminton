import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
        watch: {
            ignored: [
                '**/public/Logo_bleu_fond_rond (1).png',
                '**/.tsupgrader/**',
            ],
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('/node_modules/@firebase/firestore/'))
                        return 'firebase-firestore';
                    if (id.includes('/node_modules/@firebase/auth/'))
                        return 'firebase-auth';
                    if (id.includes('/node_modules/firebase/'))
                        return 'firebase-sdk';
                    if (id.includes('/node_modules/@firebase/'))
                        return 'firebase-core';
                },
            },
        },
    },
});
