<script setup lang="ts">
// @ts-nocheck
import { ref } from 'vue'
import QRCodeVue3 from "qrcode-vue3";

</script>

<template>
    <QRCodeVue3 :width="400" :height="400" :value="getQrValue"
        :qrOptions="{ typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'L' }" :dotsOptions="{
            type: 'dots',
            color: '#000',
            gradient: {
                type: 'linear',
                rotation: 0,
                colorStops: [
                    { offset: 0, color: '#000' },
                    { offset: 1, color: '#000' },
                ],
            },
        }" :backgroundOptions="{ color: '#ffffff' }" :cornersSquareOptions="{ type: 'dot', color: '#000000' }"
        :cornersDotOptions="{ type: 'square', color: '#000000' }" />

    <!-- v-bind:image="iconUrl"
        :imageOptions="{ hideBackgroundDots: true, imageSize: 0.4, margin: 3, crossOrigin: 'Anonymous' }" -->
</template>

<script lang="ts">
export default {
    props: {
        qrData: {
            required: true
        },
        options: {
            default: {
                errorCorrectionLevel: "L"
            }
        }
    },
    data() {
        return {
            qrValue: ref(""),
        }
    },
    computed: {
        getQrValue() {
            console.log(JSON.stringify(this.qrData))
            return JSON.stringify(this.qrData);
        },
    },
    methods: {
    }
}
</script>