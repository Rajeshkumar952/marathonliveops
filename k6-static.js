import http from 'k6/http';
import { check, sleep } from 'k6';
export const options={stages:[{duration:'30s',target:100},{duration:'1m',target:500},{duration:'1m',target:1000},{duration:'30s',target:0}],thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<1500']}};
const BASE=__ENV.BASE_URL||'http://localhost:8080';
export default function(){const r=http.get(BASE+'/');check(r,{'HTTP 200':x=>x.status===200,'HTML returned':x=>x.body.includes('Marathon LiveOps')});sleep(Math.random()*2+0.5);}
