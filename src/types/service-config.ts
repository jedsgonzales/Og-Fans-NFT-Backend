export interface ServiceConfig {
    require_path:string;
    enabled: boolean;
    mountPath:string;
    config?:any[];
  }