import {Readable} from 'node:stream';
export async function invoke(handler,{method='POST',data,headers={},raw}={}){
 const req=Readable.from(raw===undefined?[]:[Buffer.from(raw)]);req.method=method;req.headers={host:'test.example','content-type':'application/json',...headers};if(data!==undefined)req.body=data;
 const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(s){this.value=JSON.parse(s);}};await handler(req,res);return {status:res.statusCode,headers:res.headers,data:res.value};
}
