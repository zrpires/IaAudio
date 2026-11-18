// Audio is processed in this worker. Network access is only for library/model downloads.
let pipelinePromise;
async function getPipeline(id){
 if(!pipelinePromise)pipelinePromise=(async()=>{
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.min.js');
  env.allowLocalModels=false;env.useBrowserCache=true;
  env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
  env.backends.onnx.wasm.wasmPaths='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/';
  return pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{
   device:'wasm',dtype:'q8',progress_callback:event=>self.postMessage({id,type:'progress',status:event.status,file:event.file,progress:event.progress})
  });
 })().catch(error=>{pipelinePromise=null;throw error;});
 return pipelinePromise;
}
self.onmessage=async({data})=>{
 const {id,type,audio}=data;
 try{
  const transcriber=await getPipeline(id);
  if(type==='load'){self.postMessage({id,type:'ready'});return;}
  if(type!=='transcribe')throw Error('Solicitação de voz inválida.');
  const output=await transcriber(audio,{language:'portuguese',task:'transcribe',chunk_length_s:25,stride_length_s:5,return_timestamps:false});
  self.postMessage({id,type:'result',text:output.text});
 }catch(error){console.error('Falha no modelo local:',error);self.postMessage({id,type:'error',message:'Não foi possível executar o modelo local. Confira a conexão para baixar os arquivos, tente novamente ou use o texto. Dispositivos com pouca memória podem não executar a transcrição. Detalhe: '+String(error.message||error).slice(0,500)});}
};
