// tslint:disable-next-line:no-namespace
declare namespace NodeJS {
    export interface ProcessEnv {
        RABBITMQ_URL: string;
        COCONUT_API_KEY: string;
        UGC_S3_COMPAT_ENDPOINT: string;
        UGC_S3_COMPAT_ACCESS_KEY_ID: string;
        UGC_S3_COMPAT_SECRET_ACCESS_KEY: string;
        UGC_S3_COMPAT_BUCKET: string;
        UGC_S3_COMPAT_REGION: string;
    }
}