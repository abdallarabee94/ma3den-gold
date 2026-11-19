import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const initialData = {
  goldGlobal: 2048.35,
  gold24: 3945,
  gold21: 3451,
  gold18: 2958,
  coin: 27608,
  silverGlobal: 23.18,
  silverLocal: 39.4,
  dollarBuy: 49.62,
  dollarSell: 49.72,
};

const money = (value, digits = 2) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

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
  const [data, setData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setDeferredPrompt(event); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const timeLabel = useMemo(() => new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(lastUpdated), [lastUpdated]);
  const refresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => { setData(prev => ({ ...prev, goldGlobal: +(prev.goldGlobal + (Math.random() - .5) * 2).toFixed(2), silverGlobal: +(prev.silverGlobal + (Math.random() - .5) * .1).toFixed(2) })); setLastUpdated(new Date()); setIsRefreshing(false); }, 650);
  };
  const install = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Icon name="trend" size={22} /></div><div><span className="eyebrow">متابعة الأسواق</span><h1>مؤشر المعادن</h1></div></div>
      <div className="header-actions"><span className="market-status"><i /> السوق متابع</span>{deferredPrompt && !installed && <button className="install-btn" onClick={install}><Icon name="download" size={17} /> أضف للشاشة</button>}</div>
    </header>

    <main>
      <section className="hero"><div><span className="kicker">الخميس، 19 نوفمبر 2026</span><h2>الأرقام المهمة<br /><em>في لمحة واحدة.</em></h2><p>أسعار استرشادية للذهب والفضة والدولار — محليًا وعالميًا.</p></div><div className="hero-orb"><span>◌</span><small>بيانات<br />الأسواق</small></div></section>

      <section className="overview-grid">
        <StatCard icon="gold" title="الذهب العالمي" subtitle="أونصة تروي · دولار" value={`$${money(data.goldGlobal)}`} unit="للأونصة" change="+0.42%" />
        <StatCard icon="silver" title="الفضة العالمية" subtitle="أونصة تروي · دولار" value={`$${money(data.silverGlobal)}`} unit="للأونصة" change="+1.18%" tone="silver-tone" />
        <StatCard icon="dollar" title="الدولار" subtitle="مقابل الجنيه المصري" value={money(data.dollarSell)} unit="جنيه" change="سعر البيع" tone="dark-tone" />
      </section>

      <section className="section-heading"><div><span className="section-kicker">السوق المحلي</span><h2>أسعار الذهب اليوم</h2></div><div className="update-control"><span>آخر تحديث {timeLabel}</span><button onClick={refresh} className={isRefreshing ? 'spinning' : ''} aria-label="تحديث الأسعار"><Icon name="refresh" size={18} /></button></div></section>
      <section className="local-grid">
        <article className="local-card featured"><div className="local-top"><span className="mini-icon gold-icon"><Icon name="gold" size={18} /></span><span>عيار 21</span><b>الأكثر تداولًا</b></div><strong>{money(data.gold21)} <small>جنيه / جرام</small></strong><div className="mini-change">↗ 12.00 جنيه عن الأمس</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon"><Icon name="gold" size={18} /></span><span>عيار 24</span></div><strong>{money(data.gold24)} <small>جنيه / جرام</small></strong><div className="mini-change">↗ 14.00 جنيه عن الأمس</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon"><Icon name="gold" size={18} /></span><span>عيار 18</span></div><strong>{money(data.gold18)} <small>جنيه / جرام</small></strong><div className="mini-change">↗ 10.00 جنيه عن الأمس</div></article>
        <article className="local-card"><div className="local-top"><span className="mini-icon coin-icon"><Icon name="silver" size={18} /></span><span>جنيه الذهب</span></div><strong>{money(data.coin)} <small>جنيه</small></strong><div className="mini-change">↗ 96.00 جنيه عن الأمس</div></article>
      </section>

      <section className="split-grid"><article className="panel"><div className="panel-title"><div><span className="section-kicker">الفضة محليًا</span><h2>سعر جرام الفضة</h2></div><span className="pill">عيار 999</span></div><div className="big-number">{money(data.silverLocal)} <small>جنيه</small></div><div className="bar"><span style={{ width: '64%' }} /></div><div className="range-labels"><span>أقل سعر اليوم</span><b>السعر الحالي</b><span>أعلى سعر اليوم</span></div></article><article className="panel dollar-panel"><div className="panel-title"><div><span className="section-kicker">سوق العملات</span><h2>الدولار الأمريكي</h2></div><span className="round-dollar">$</span></div><div className="currency-row"><div><span>شراء</span><strong>{money(data.dollarBuy)} <small>جنيه</small></strong></div><div className="divider" /><div><span>بيع</span><strong>{money(data.dollarSell)} <small>جنيه</small></strong></div></div></article></section>

      <div className="notice"><Icon name="info" size={18} /><span>الأسعار المعروضة استرشادية وقد تختلف حسب مصدر التسعير والمصنعية. سيتم ربط مصدر مباشر عند تفعيله.</span></div>
    </main>
    <footer><span>مؤشر المعادن <b>·</b> قرارات أوضح كل يوم</span><span>آخر تحديث: {timeLabel}</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
