declare module 'node-zklib' {
  export interface ZKUser {
    uid: number;
    userId: string;
    name: string;
    role?: number;
    password?: string;
    cardno?: number;
  }

  export interface ZKAttendance {
    userSn: number;
    deviceUserId: string;
    recordTime: Date;
    ip?: string;
  }

  export interface UsersResponse {
    data: ZKUser[];
  }

  export interface AttendanceResponse {
    data: ZKAttendance[];
  }

  export interface ZKRealTimeLog {
    userId: string | number;
    attTime: Date;
  }

  export default class ZKLib {
    constructor(ip: string, port: number, timeout: number, inport: number);
    createSocket(cbErr?: (err: Error) => void, cbClose?: () => void): Promise<void>;
    getUsers(): Promise<UsersResponse>;
    getAttendances(): Promise<AttendanceResponse>;
    getInfo(): Promise<{ userCounts: number; logCounts: number; logCapacity: number }>;
    executeCmd(command: number, data?: any): Promise<any>;
    getRealTimeLogs(cb: (log: ZKRealTimeLog) => void): Promise<void>;
    disconnect(): Promise<void>;
  }
}