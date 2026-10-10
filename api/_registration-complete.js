function isCompleteRegistration(u){
 if(!u)return false;
 const address=u.residence_address;
 const hasAddress=typeof address==='string'?!!address.trim():!!(address&&typeof address==='object'&&!Array.isArray(address)&&Object.values(address).some(v=>typeof v==='string'&&v.trim()));
 return Boolean(String(u.full_name||'').trim()&&String(u.phone||'').trim()&&String(u.phone_country||'').trim()&&String(u.email||'').trim()&&hasAddress);
}
module.exports={isCompleteRegistration};
