const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createController,setButtonAccess} = require("../admin-access.js");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "white07.css"), "utf8");

function buttonMock() {
  return {
    hidden: true,
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; }
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(res => { resolve = res; });
  return {promise, resolve};
}

test("profile admin entry starts hidden and hidden wins over profile-menu display rules", () => {
  assert.match(html, /<button id="openAdminFromProfile"[^>]*\bhidden\b[^>]*aria-hidden="true"/);
  assert.match(css, /body\.mk-white\s+\.profileMenu>button\s*\{[^}]*display\s*:\s*flex(?:\s*!important)?/i);
  assert.match(css, /body\.mk-white\s+\.profileMenu>button\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/i);
  const button = buttonMock();
  setButtonAccess(button, false);
  assert.equal(button.hidden, true);
  assert.equal(button.attrs["aria-hidden"], "true");
  setButtonAccess(button, true);
  assert.equal(button.hidden, false);
  assert.equal(button.attrs["aria-hidden"], "false");
});

test("profile visibility is wired only to verified access, not account profile fields", () => {
  assert.match(app, /setButtonAccess\(\$\("openAdminFromProfile"\),access\.admin\)/);
  assert.doesNotMatch(app, /openAdminFromProfile["']\)\.style\.display\s*=\s*d\.is_admin/);
  assert.match(app, /refreshAdminAccess\(\)\}\s*\}\);/);
  assert.match(app, /async function openAdminPanel\(\)\{\s*await refreshAdminAccess\(\); if\(!adminAccess\.admin\)/);
});

test("initial profile load and delayed response stay hidden until a verified admin response", async () => {
  const request = deferred(), button = buttonMock();
  const controller = createController({
    fetch: () => request.promise,
    getUserId: () => "123",
    getInitData: () => "signed-init-data",
    onAccess: access => setButtonAccess(button, access.admin)
  });
  const pending = controller.refresh();
  assert.equal(button.hidden, true);
  request.resolve({ok:true,json:async()=>({admin:true,owner:false})});
  await pending;
  assert.equal(button.hidden, false);
});

test("non-admin and failed authorization responses remain hidden", async t => {
  for (const [name, fetchImpl] of [
    ["non-admin", async()=>({ok:true,json:async()=>({admin:false})})],
    ["HTTP authorization error", async()=>({ok:false,json:async()=>({admin:true})})],
    ["network error", async()=>{throw new Error("offline");}],
    ["invalid JSON", async()=>({ok:true,json:async()=>{throw new Error("invalid JSON");}})]
  ]) {
    await t.test(name, async()=>{
      const button=buttonMock();
      const controller=createController({
        fetch:fetchImpl,getUserId:()=>"123",getInitData:()=>"signed",
        onAccess:access=>setButtonAccess(button,access.admin)
      });
      await controller.refresh();
      assert.equal(button.hidden,true);
      assert.equal(button.attrs["aria-hidden"],"true");
    });
  }
});

test("reopening profile hides an old grant while refreshing and applies latest access", async () => {
  const replies=[deferred(),deferred()];
  let calls=0;
  const button=buttonMock();
  const controller=createController({
    fetch:()=>replies[calls++].promise,
    getUserId:()=>"123",getInitData:()=>"signed",
    onAccess:access=>setButtonAccess(button,access.admin)
  });
  const first=controller.refresh();
  replies[0].resolve({ok:true,json:async()=>({admin:true})});
  await first;
  assert.equal(button.hidden,false);

  const reopened=controller.refresh();
  assert.equal(button.hidden,true);
  replies[1].resolve({ok:true,json:async()=>({admin:true})});
  await reopened;
  assert.equal(button.hidden,false);
});

test("late response from an earlier profile open cannot override latest access", async () => {
  const replies=[deferred(),deferred()];
  let calls=0;
  const button=buttonMock();
  const controller=createController({
    fetch:()=>replies[calls++].promise,
    getUserId:()=>"123",getInitData:()=>"signed",
    onAccess:access=>setButtonAccess(button,access.admin)
  });
  const older=controller.refresh();
  const latest=controller.refresh();
  replies[1].resolve({ok:true,json:async()=>({admin:true})});
  await latest;
  replies[0].resolve({ok:true,json:async()=>({admin:false})});
  await older;
  assert.equal(button.hidden,false);
});
