const crypto = require('crypto');
function verifyTelegram(initData, botToken){
  const token=String(botToken||'').trim();
  const raw=String(initData||'');
  if(!token) return {ok:false,error:'Server bot token missing'};
  if(!raw) return {ok:false,error:'Telegram initData missing'};
  const p=new URLSearchParams(raw);
  const hash=p.get('hash');
  if(!hash) return {ok:false,error:'Telegram hash missing'};
  p.delete('hash');
  const data=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  const calc=crypto.createHmac('sha256',secret).update(data).digest('hex');
  try{
    const a=Buffer.from(calc,'hex'), b=Buffer.from(hash,'hex');
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return {ok:false,error:'Telegram signature mismatch'};
  }catch{return {ok:false,error:'Telegram signature check failed'};}
  const auth=Number(p.get('auth_date')||0);
  if(!auth) return {ok:false,error:'Telegram auth_date missing'};
  const age=Math.floor(Date.now()/1000)-auth;
  if(age < -300) return {ok:false,error:'Telegram auth_date is in the future'};
  if(age > 604800) return {ok:false,error:'Telegram session expired. Close and reopen Mini App'};
  try{
    const user=JSON.parse(p.get('user')||'null');
    if(!user?.id) return {ok:false,error:'Telegram user missing'};
    return {ok:true,user};
  }catch{return {ok:false,error:'Telegram user data invalid'};}
}

// Personal information lives on the existing auction_users row. This endpoint
// deliberately never inserts a user and never accepts an ID from the browser.
const INFORMATION_COLUMNS = [
  'email', 'phone', 'phone_country', 'full_name', 'residence_address',
  'postal_code', 'mailing_address', 'mailing_same_as_residence'
].join(',');
const PHONE_COUNTRIES = {
  AE: { code: '971', length: 9, trunk: '0' },
  KZ: { code: '7', length: 10, trunk: '8', starts: /^[67]/ },
  RU: { code: '7', length: 10, trunk: '8', starts: /^[3489]/ },
  US: { code: '1', length: 10 },
  GB: { code: '44', length: 10, trunk: '0' },
  GE: { code: '995', length: 9, trunk: '0' }
};

class RequestError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function editableText(value, label, maxLength) {
  if (typeof value !== 'string') {
    throw new RequestError(400, label + ' must be text');
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new RequestError(400, label + ' is too long');
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    throw new RequestError(400, label + ' contains invalid characters');
  }
  return text || null;
}

function editableAddress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError(400, 'Address must contain country, city and street');
  }
  const address = {};
  for (const [key, maxLength] of [
    ['country', 100], ['region', 100], ['city', 100], ['street', 300]
  ]) {
    address[key] = editableText(value[key] ?? '', key, maxLength) || '';
  }
  if (!Object.values(address).some(Boolean)) return null;
  if (!address.country || !address.city || !address.street) {
    throw new RequestError(400, 'Enter country, city and street');
  }
  return address;
}

function editablePhone(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError(400, 'Phone must contain number and country');
  }
  if (typeof value.country !== 'string') {
    throw new RequestError(400, 'Select a phone country');
  }
  const country = value.country.trim().toUpperCase();
  const plan = PHONE_COUNTRIES[country];
  if (!plan) throw new RequestError(400, 'Select a supported phone country');
  const number = editableText(value.number, 'Phone', 64);
  if (!number) return { phone: null, phone_country: null };
  if (!/^\+?[\d\s().-]+$/.test(number)) {
    throw new RequestError(400, 'Enter a valid phone number');
  }
  let digits = number.replace(/\D/g, '');
  const international = number.startsWith('+');
  if (international) {
    if (!digits.startsWith(plan.code)) {
      throw new RequestError(400, 'Phone code does not match the selected country');
    }
    digits = digits.slice(plan.code.length);
  } else if (
    digits.length === plan.code.length + plan.length &&
    digits.startsWith(plan.code)
  ) {
    digits = digits.slice(plan.code.length);
  } else if (
    plan.trunk && digits.length === plan.length + 1 &&
    digits.startsWith(plan.trunk)
  ) {
    digits = digits.slice(1);
  }
  if (
    digits.length !== plan.length ||
    !/^[1-9]\d+$/.test(digits) ||
    (plan.starts && !plan.starts.test(digits))
  ) {
    throw new RequestError(400, 'Enter a valid phone number for the selected country');
  }
  return { phone: '+' + plan.code + digits, phone_country: country };
}

function editablePatch(field, value) {
  switch (field) {
    case 'email': {
      const email = editableText(value, 'Email', 254);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new RequestError(400, 'Enter a valid email address');
      }
      return { email };
    }
    case 'phone':
      return editablePhone(value);
    case 'full_name':
      return { full_name: editableText(value, 'Full name', 160) };
    case 'residence_address':
      return { residence_address: editableAddress(value) };
    case 'postal_code':
      return { postal_code: editableText(value, 'Postal code', 32) };
    case 'mailing_address': {
      if (!value || typeof value !== 'object' ||
          Array.isArray(value) || typeof value.same_as_residence !== 'boolean') {
        throw new RequestError(400, 'Choose whether mailing matches the residence address');
      }
      return {
        mailing_same_as_residence: value.same_as_residence,
        mailing_address: value.same_as_residence ? null : editableAddress(value.address)
      };
    }
    default:
      throw new RequestError(400, 'This account field cannot be edited');
  }
}

function informationFromRow(row) {
  const sameAsResidence = row.mailing_same_as_residence === true;
  return {
    email: row.email ?? null,
    phone: row.phone ?? null,
    phone_country: row.phone_country ?? null,
    full_name: row.full_name ?? null,
    residence_address: row.residence_address ?? null,
    postal_code: row.postal_code ?? null,
    mailing_address: sameAsResidence
      ? row.residence_address ?? null
      : row.mailing_address ?? null,
    mailing_same_as_residence: sameAsResidence
  };
}

async function accountRequest(telegramId, patch) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new RequestError(503, 'Редактор личной информации временно недоступен. Попробуйте позже.', 'storage_unavailable');
  }
  const base = (process.env.SUPABASE_URL ||
    'https://exfxcgiuotraszeqefha.supabase.co').replace(/\/+$/, '');
  const path = 'auction_users?telegram_id=eq.' +
    encodeURIComponent(String(telegramId)) + '&select=' + INFORMATION_COLUMNS;
  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json'
  };
  const options = { method: patch ? 'PATCH' : 'GET', headers };
  if (patch) {
    headers.Prefer = 'return=representation';
    options.body = JSON.stringify(patch);
  }
  let response;
  let rows;
  try {
    response = await fetch(base + '/rest/v1/' + path, options);
    rows = await response.json();
  } catch {
    throw new RequestError(502, 'Could not reach account storage. Please try again');
  }
  if (!response.ok) {
    // PostgREST reports missing columns as either schema-cache or SQL errors.
    // Do not silently fall back to browser-only persistence.
    if (['PGRST204', '42703', '42P01'].includes(rows?.code)) {
      throw new RequestError(503,
        'Редактор личной информации временно недоступен. Попробуйте позже.', 'migration_required');
    }
    throw new RequestError(502, 'Could not save or load account information');
  }
  if (!Array.isArray(rows)) {
    throw new RequestError(502, 'Account storage returned an invalid response');
  }
  if (!rows.length) {
    throw new RequestError(404, 'Existing account not found. Reopen the Mini App');
  }
  return informationFromRow(rows[0]);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const verified = verifyTelegram(req.body?.initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!verified.ok) {
    return res.status(401).json({ error: verified.error });
  }
  try {
    const action = req.body?.action;
    if (!['read','update','complete_registration'].includes(action)) {
      throw new RequestError(400, 'Use read, update or complete_registration for account information');
    }
    let patch=null;
    if(action==='update') patch=editablePatch(req.body.field, req.body.value);
    if(action==='complete_registration'){
      const full=editablePatch('full_name',req.body.full_name).full_name;
      const phone=editablePatch('phone',req.body.phone);
      const email=editablePatch('email',req.body.email||'').email;
      const residence=editableText(req.body.residence_address||'','Адрес проживания',300);
      if(!full)throw new RequestError(400,'Введите имя');
      if(!phone.phone||!phone.phone_country)throw new RequestError(400,'Введите номер телефона');
      if(!email)throw new RequestError(400,'Введите Email');
      if(!residence)throw new RequestError(400,'Введите адрес проживания');
      patch={full_name:full,...phone,email,residence_address:{country:'',region:'',city:'',street:residence}};
    }
    const information = await accountRequest(verified.user.id, patch);
    return res.status(200).json({ information });
  } catch (error) {
    return res.status(error instanceof RequestError ? error.status : 500).json({
      error: error instanceof RequestError
        ? error.message
        : 'Could not save or load account information',
      ...(error.code ? { code: error.code } : {})
    });
  }
};
