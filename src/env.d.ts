declare namespace NodeJS {
  export interface ProcessEnv {
    APP_ENVIRONMENT?: string;

    RABBITMQ_USER: string;
    RABBITMQ_PASSWORD: string;
    RABBITMQ_HOST: string;
    RABBITMQ_PORT?: string;

    COCONUT_API_KEY: string;

    UGC_S3_COMPAT_ENDPOINT: string;
    UGC_S3_COMPAT_ACCESS_KEY_ID: string;
    UGC_S3_COMPAT_SECRET_ACCESS_KEY: string;
    UGC_S3_COMPAT_BUCKET: string;
    UGC_S3_COMPAT_REGION: string;

    SENTRY_DSN?: string;
  }
}
