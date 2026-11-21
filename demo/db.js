/* طبقة بيانات نسخة العرض: localStorage بس، معزولة تماماً عن النظام الحقيقي */
'use strict';
const DB = (() => {
  const KEY = 'shopdemo-v1';
  const state = { items: [], log: [], shifts: [], shop: null, plans: [], payments: [] };
  const listeners = [];
  let ready = false;
  const uid = () => 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const onChange = f => listeners.push(f);
  const fire = w => listeners.forEach(f => { try { f(w); } catch (e) { console.error(e); } });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  function seed() {
    const now = Date.now(), D = 864e5;
    state.shop = { name: 'محل الأمل للموبايلات (نسخة تجريبية)', info: 'القاهرة · 01000000000', vat: 14, prefix: 'DM', staff: 'أحمد، محمد', ownerPin: 'fecdaace59128697f2c1015e6054e7dbb6c5a12f18bbf745283e133180e948f3' };
    const it = (name, cat, qty, buy, sell, min, extra) => ({ id: uid(), name, cat, qty, buy, sell, min, taxAmt: cat === 'acc' ? 0 : Math.round(sell * 0.14), added: now - 40 * D, ...extra });
    state.items = [
      it('iPhone 15 Pro 256GB', 'new', 3, 52000, 58500, 1, { imei: '356700000000011', color: 'تيتانيوم', spec: '256GB' }),
      it('Samsung Galaxy S24', 'new', 4, 31000, 35500, 2, { imei: '356700000000028', color: 'أسود', spec: '256GB' }),
      it('Xiaomi Redmi Note 13', 'new', 8, 7200, 8600, 3, { imei: '356700000000035', spec: '128GB' }),
      it('Oppo Reno 11', 'new', 1, 14500, 17000, 2, { imei: '356700000000042', spec: '256GB' }),
      it('iPhone 12 مستعمل', 'used', 1, 14000, 17500, 0, { imei: '356700000000059', battery: '86%', color: 'أزرق', spec: '128GB', supplier: 'عميل' }),
      it('شاحن سريع 25W', 'acc', 24, 180, 320, 10, { barcode: 'ACC-0001' }),
      it('جراب حماية', 'acc', 3, 60, 150, 8, { barcode: 'ACC-0002' })
    ];
    const sold = [['Xiaomi Redmi Note 13', 8600, 7200], ['Samsung Galaxy S24', 35500, 31000], ['شاحن سريع 25W', 320, 180], ['iPhone 15 Pro 256GB', 58500, 52000], ['Oppo Reno 11', 17000, 14500], ['جراب حماية', 150, 60]];
    let n = 100;
    for (let m = 5; m >= 0; m--) for (let k = 0; k < 6 + (5 - m); k++) {
      const s = sold[(k + m) % sold.length], t = now - m * 30 * D - (k * 3 + 1) * D + k * 3e6;
      state.log.push({ t, iid: '', name: s[0], type: 'sell', qty: 1, price: s[1], cost: s[2], inv: 'DM-' + (n++), by: k % 2 ? 'محمد' : 'أحمد', dev: 'seed', paym: 'cash', taxAmt: s[0].includes('شاحن') || s[0].includes('جراب') ? 0 : Math.round(s[1] * 0.14), buyer: { name: 'عميل', phone: '', nid: '', addr: '' } });
    }
    const pid = uid();
    state.plans = [{ id: pid, createdAt: now - 35 * D, inv: 'DM-INST1', iid: '', itemName: 'Samsung Galaxy S24', imei: '356700000000028', customer: { name: 'محمود علي (تجريبي)', phone: '01012345678', nid: '', addr: '' }, total: 40470, down: 10000, months: 6, monthly: 5079, firstDue: now - 5 * D, status: 'active', by: 'أحمد', dev: 'seed' }];
    state.payments = [{ id: uid(), t: now - 5 * D, planId: pid, amount: 5079, note: 'القسط الأول', by: 'أحمد', dev: 'seed' }];
    state.shifts = [{ id: uid(), status: 'open', openedAt: now - 3 * 36e5, openedBy: 'أحمد', openCash: 1000, openNote: 'شيفت تجريبي' }];
    save();
  }
  function sortAll() {
    state.items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
    state.log.sort((a, b) => (b.t || 0) - (a.t || 0));
    state.shifts.sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
    state.payments.sort((a, b) => (b.t || 0) - (a.t || 0));
  }
  async function init() {
    try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.items) Object.assign(state, c); else seed(); } catch (e) { seed(); }
    sortAll(); ready = true; fire({ table: '_status' });
  }
  const upsert = (arr, id, doc) => { const i = arr.findIndex(x => x.id === id); const v = { id, ...doc }; if (i >= 0) arr[i] = v; else arr.push(v); };
  const put = async (table, id, doc) => {
    if (table === 'settings') state.shop = doc; else upsert(state[table], id, doc);
    sortAll(); save(); fire({ table });
  };
  const del = async (table, id) => { const i = state[table].findIndex(x => x.id === id); if (i >= 0) state[table].splice(i, 1); save(); fire({ table }); };
  return {
    init, onChange, uid, loadCache: () => false, link: async () => 'owner',
    get ready() { return ready; }, get online() { return true; }, get role() { return 'owner'; }, state,
    saveShop: doc => put('settings', 'shop', doc),
    putItem: (id, doc) => put('items', id, doc), delItem: id => del('items', id),
    addLog: rec => { const id = uid(); return put('log', id, rec).then(() => id); },
    putShift: (id, doc) => put('shifts', id, doc), addShift: doc => { const id = uid(); return put('shifts', id, doc).then(() => id); },
    putPlan: (id, doc) => put('plans', id, doc), addPlan: doc => { const id = uid(); return put('plans', id, doc).then(() => id); },
    addPayment: rec => { const id = uid(); return put('payments', id, rec).then(() => id); },
    reset: () => { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
  };
})();
