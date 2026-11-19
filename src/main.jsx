import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const MARKET_API_URL = import.meta.env.VITE_MARKET_API_URL || '/api/market';
const money = (value, digits = 2) => value == null || Number.isNaN(Number(value)) ? '—' : new Intl.NumberFormat('ar-EG', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
const numberOrNull = (value) => value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value);

function normalizeMarketPayload(payload) {
  const gold = payload?.gold || {};
  const silver = payload?.silver || {};
  const dollar = payload?.dollar || {};
  const dollarSell = numberOrNull(dollar.price ?? dollar.ask);
  const gold21 = numberOrNull(gold.localEgpPerGram21);
  return {
    goldGlobal: numberOrNull(gold.globalUsdPerOunce),
    gold24: numberOrNull(gold.localEgpPerGram24),
    gold21,
    gold18: numberOrNull(gold.localEgpPerGram18),
    coin: gold21 == null ? null : gold21 * 8,
    silverGlobal: numberOrNull(silver.globalUsdPerOunce),
    silverLocal: numberOrNull(silver.localEgpPerGram ?? (numberOrNull(silver.globalUsdPerGram) != null && dollarSell != null ? Number(silver.globalUsdPerGram) * dollarSell : null)),
    dollarBuy: numberOrNull(dollar.bid ?? dollar.price),
    dollarSell,
    goldChange: numberOrNull(gold.changePercent),
    silverChange: numberOrNull(silver.changePercent),
    updatedAt: payload?.updatedAt || null,
  };
}

async function loadMarketPrices(signal) {
  const response = await fetch(MARKET_API_URL, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`تعذر تحميل الأسعار (${response.status})`);
  const payload = await response.json();
  return normalizeMarketPayload(payload);
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    trend: <><path d="M3 17l6-6 4 4 7-8"/><path d="M15 7h5v5"/></>,
    gold: <><path d="M4 18h16"/><path d="M6 18V9h5v9M13 18V5h5v13"/><circle cx="8.5" cy="5" r="1.5"/></>,
    silver: <><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c.4-1 1.3-1.5 2.6-1.5 1.4 0 2.4.7 2.4 1.8 0 2.4-5 1.2-5 3.8 0 1.1 1 1.9 2.6 1.9 1.3 0 2.3-.5 2.8-1.5"/></>,
    dollar: <><circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.3c-.5-.7-1.4-1.1-2.5-1.1-1.4 0-2.4.7-2.4 1.8 0 2.4 5 1.2 5 3.8 0 1.1-1 1.9-2.5 1.9-1.2 0-2.2-.4-2.8-1.2"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.8-3L3 11"/><path d="M3 5v6h6"/><path d="M4 13a8 8 0 0 0 14.8 3L21 13"/><path d="M21 19v-6h-6"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function StatCard({ icon, title, subtitle, value, unit, change, tone = 'green' }) {
  return <article className={`stat-card ${tone}`}>
    <div className="card-head"><span className="icon-wrap"><Icon name={icon} /></span><div><h3>{title}</h3><p>{subtitle}</p></div></div>
    <div className="value-row"><strong>{value}</strong><span>{unit}</span></div>
    {change && <span className="change positive">↗ {change}</span>}
  </article>;
}

function App() {
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const nextData = await loadMarketPrices(controller.signal);
      setData(nextData);
      setLastUpdated(nextData.updatedAt ? new Date(nextData.updatedAt) : new Date());
    } catch (requestError) {
      setError(requestError.name === 'AbortError' ? 'انتهت مهلة الاتصال بمصدر الأسعار.' : requestError.message || 'تعذر تحديث الأسعار حاليًا.');
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setDeferredPrompt(event); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.clearInterval(timer); };
  }, []);

  const timeLabel = useMemo(() => lastUpdated ? new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(lastUpdated) : 'جاري التحديث', [lastUpdated]);
  const install = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); };
  const value = (item, prefix = '', digits = 2) => `${prefix}${money(data?.[item], digits)}`;
  const percent = (item) => data?.[item] == null ? null : `${data[item] > 0 ? '+' : ''}${money(data[item], 2)}%`;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="trend" size={22} /></div><div><span className="eyebrow">متابعة الأسواق</span><h1>مؤشر المعادن</h1></div></div>
      <div className="header-actions"><span className="market-status"><i className={data ? '' : 'offline'} /> {data ? 'بيانات حية' : 'جاري الاتصال'}</span>{deferredPrompt && !installed && <button className="install-btn" onClick={install}><Icon name="download" size={17} /> أضف للشاشة</button>}</div>
    </header>

    <main>
      <section className="hero"><div><span className="kicker">أسعار محدثة تلقائيًا كل دقيقة</span><h2>الأرقام المهمة<br /><em>في لمحة واحدة.</em></h2><p>أسعار الذهب والفضة والدولار من مصدر البيانات المتصل بالموقع.</p></div><div className="hero-orb"><span>◌</span><small>بيانات<br />مباشرة</small></div></section>

      {error && <div className="error-notice"><Icon name="info" size={18} /><span>{error}</span><button onClick={refresh}>حاول مرة أخرى</button></div>}
      {isLoading && !data && <div className="loading-strip">جاري جلب أسعار الذهب والفضة والدولار…</div>}

      <section className="overview-grid">
        <StatCard icon="gold" title="الذهب العالمي" subtitle="أونصة تروي · دولار" value={value('goldGlobal', '$')} unit="للأونصة" change={percent('goldChange')} />
        <StatCard icon="silver" title="الفضة العالمية" subtitle="أونصة تروي · دولار" value={value('silverGlobal', '$')} unit="للأونصة" change={percent('silverChange')} tone="silver-tone" />
        <StatCard icon="dollar" title="الدولار" subtitle="مقابل الجنيه المصري" value={money(data?.dollarSell)} unit="جنيه" change={data ? 'سعر البيع' : null} tone="dark-tone" />
      </section>

      <section className="section-heading"><div><span className="section-kicker">السوق المحلي</span><h2>أسعار الذهب اليوم</h2></div><div className="update-control"><span>آخر تحديث {timeLabel}</span><button onClick={refresh} className={isRefreshing ? 'spinning' : ''} aria-label="تحديث الأسعار"><Icon name="refresh" size={18} /></button></div></section>
      <section className="local-grid">
        <article className="local-card featured"><div className="local-top"><span className="mini-icon gold-icon"><Icon name="gold" size={18} /></span><span>عيار 21</span><b>الأكثر تداولًا</b></div><strong>{money(data?.gold21)} <small>جنيه / جرام</small></strong><div className="mini-change">من مصدر الأسعار الحي</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon"><Icon name="gold" size={18} /></span><span>عيار 24</span></div><strong>{money(data?.gold24)} <small>جنيه / جرام</small></strong><div className="mini-change">من مصدر الأسعار الحي</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon"><Icon name="gold" size={18} /></span><span>عيار 18</span></div><strong>{money(data?.gold18)} <small>جنيه / جرام</small></strong><div className="mini-change">من مصدر الأسعار الحي</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon coin-icon"><Icon name="silver" size={18} /></span><span>جنيه الذهب</span></div><strong>{money(data?.coin)} <small>جنيه</small></strong><div className="mini-change">عيار 21 × 8 جرام</div></article>
      </section>

      <section className="split-grid"><article className="panel"><div className="panel-title"><div><span className="section-kicker">الفضة محليًا</span><h2>سعر جرام الفضة</h2></div><span className="pill">عيار 999</span></div><div className="big-number">{money(data?.silverLocal)} <small>جنيه</small></div><div className="bar"><span style={{ width: '64%' }} /></div><div className="range-labels"><span>سعر محسوب من السوق العالمي</span><b>السعر الحالي</b><span>يتغير تلقائيًا</span></div></article><article className="panel dollar-panel"><div className="panel-title"><div><span className="section-kicker">سوق العملات</span><h2>الدولار الأمريكي</h2></div><span className="round-dollar">$</span></div><div className="currency-row"><div><span>شراء</span><strong>{money(data?.dollarBuy)} <small>جنيه</small></strong></div><div className="divider" /><div><span>بيع</span><strong>{money(data?.dollarSell)} <small>جنيه</small></strong></div></div></article></section>

      <div className="notice"><Icon name="info" size={18} /><span>الأسعار تُجلب من Backend الموقع. السعر المحلي للذهب والفضة قد يختلف عن سعر المحلات بسبب المصنعية وهامش البيع.</span></div>
    </main>
    <footer><span>مؤشر المعادن <b>·</b> قرارات أوضح كل يوم</span><span>آخر تحديث: {timeLabel}</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
