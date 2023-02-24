declare namespace NodeJS {
  export interface ProcessEnv {
    APP_ENVIRONMENT?: string;

    RABBITMQ_USER: string;
    RABBITMQ_PASSWORD: string;
    RABBITMQ_HOST: string;
    RABBITMQ_PORT?: string;

    COCONUT_API_KEY: string;

    AWS_S3_ENDPOINT: string;
    AWS_S3_BUCKET: string;
    AWS_S3_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;

    SENTRY_DSN?: string;
  }
}
