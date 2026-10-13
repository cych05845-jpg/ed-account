/*!
 * 嘉基急診 帳號中心 — 其他程式的接入檔 account-sdk.js
 *
 * 用法（放在各程式的 index.html）：
 *   <script src="https://cych05845-jpg.github.io/ed-account/account-sdk.js"></script>
 *   <script>
 *     ACCOUNT.require("hub.announce").then(user => {
 *       // 已登入、而且有「學習站發公告」權限
 *       console.log(user.name, user.perms);
 *     });
 *   </script>
 *
 * 說明：
 *  - 所有放在 cych05845-jpg.github.io 底下的程式共用同一個登入狀態，
 *    在帳號中心登入一次，其他程式就不用再登入（同一台裝置、同一個瀏覽器）。
 *  - 沒登入時 require() 會把使用者帶到帳號中心，登入後自動回來。
 *  - 權限一律再由後端 verify 確認，不只看瀏覽器裡的資料。
 *  - 程式自己的後端（例如 Apps Script）要做寫入時，應把 ACCOUNT.token() 一起送過去，
 *    由後端呼叫帳號中心的 verify 再確認一次。
 */
(function (w) {
  var API_URL = "https://script.google.com/macros/s/AKfycbxRaXVY1dTlfuJKlsrg1d_mg7qDVAc0Ezos1ATMdENiyl-IiCRs9a7dOU1Ftl9INWZu/exec";          // ← 貼上帳號中心 Apps Script Web App 網址（和 index.html 相同）
  var CENTER_URL = "https://cych05845-jpg.github.io/ed-account/";
  var KEY = "cych_ed_account";

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }

  function call(action, body) {
    if (!API_URL) return Promise.reject(new Error("account-sdk.js 尚未設定 API_URL"));
    body = body || {}; body.action = action;
    return fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  var ACCOUNT = {
    /** 目前的登入憑證（送到自己後端驗證用），沒登入回傳 null */
    token: function () { var s = load(); return s && s.exp > Date.now() ? s.token : null; },

    /** 瀏覽器裡暫存的使用者（只供畫面顯示，不能拿來判斷權限） */
    cachedUser: function () { var s = load(); return s && s.exp > Date.now() ? s.user : null; },

    /** 向帳號中心確認登入狀態；perm 可省略。回傳 {ok, user, has} */
    verify: function (perm) {
      var t = ACCOUNT.token();
      if (!t) return Promise.resolve({ ok: false, error: "尚未登入" });
      return call("verify", { token: t, perm: perm }).then(function (r) {
        if (!r.ok) save(null);
        else { var s = load(); if (s) { s.user = r.user; save(s); } }
        return r;
      });
    },

    /** 需要登入（及某權限）才能繼續；沒登入就轉到帳號中心。成功時回傳 user。 */
    require: function (perm) {
      return ACCOUNT.verify(perm).then(function (r) {
        if (!r.ok) { ACCOUNT.goLogin(); return new Promise(function () {}); }
        if (perm && !r.has) throw new Error("你沒有這項權限，請洽帳號管理者");
        return r.user;
      });
    },

    /** 有登入就回傳 user，沒有回傳 null（不轉頁，適合「登入後多出管理按鈕」的頁面） */
    optional: function (perm) {
      return ACCOUNT.verify(perm).then(function (r) { return r.ok ? Object.assign({ has: r.has }, r.user) : null; })
        .catch(function () { return null; });
    },

    /** 轉到帳號中心登入，登入後回到目前頁面 */
    goLogin: function () { location.href = CENTER_URL + "?back=" + encodeURIComponent(location.href); },

    logout: function () { var t = ACCOUNT.token(); save(null); if (t) call("logout", { token: t }).catch(function () {}); }
  };

  w.ACCOUNT = ACCOUNT;
})(window);
