(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GalaxyAdminAccess=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  function denied(){return{admin:false,owner:false};}
  function setButtonAccess(button,allowed){
    if(!button)return;
    const visible=allowed===true;
    button.hidden=!visible;
    button.setAttribute("aria-hidden",String(!visible));
  }
  function createController({fetch:fetchImpl,getUserId,getInitData,onAccess}){
    let access=denied(),requestVersion=0;
    function publish(next){
      access=next;
      if(typeof onAccess==="function")onAccess({...access});
    }
    async function refresh(){
      const version=++requestVersion;
      publish(denied());
      if(!getUserId())return{...access};
      try{
        const response=await fetchImpl("/api/admin-access",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({initData:getInitData()||""})
        });
        const data=response.ok?await response.json():null;
        if(version===requestVersion)publish({
          admin:data?.admin===true,
          owner:data?.owner===true
        });
      }catch(error){
        if(version===requestVersion)publish(denied());
      }
      return{...access};
    }
    return{refresh,getAccess:()=>({...access})};
  }
  return{createController,setButtonAccess};
});
