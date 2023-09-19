declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      NODE_ENV: 'build' | 'development' | 'production' | 'test';
      JWT_SECRET: '@developer@NkowaOkwu@secret@key@';
    }
  }
}
