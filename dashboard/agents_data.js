// Datos de agentes BAST · sincronizados con conectores reales
window.AGENTS_DATA = {
  agents: [
    {
      name: 'Computer · Perplexity',
      role: 'Agente principal · análisis y orquestación',
      icon: '◉',
      color: '#3B82F6',
      status: 'online',
      current_task: 'Procesando matches Heineman vs prospects',
      runs_24h: 47,
      success_rate: 98,
      last_run: 'hace 2 min',
      url: 'https://www.perplexity.ai/'
    },
    {
      name: 'HubSpot CRM',
      role: 'Sincronización de contactos · Hub 148358528',
      icon: 'H',
      color: '#FF7A59',
      status: 'idle',
      current_task: 'Esperando primera carga de leads desde ALL_Leads_Unified',
      runs_24h: 0,
      success_rate: 100,
      last_run: 'sin runs aún',
      url: 'https://app.hubspot.com/contacts/148358528/'
    },
    {
      name: 'Slack · Tradinglead',
      role: 'Notificaciones y aprobaciones · #general-tradinglead',
      icon: '#',
      color: '#4A154B',
      status: 'online',
      current_task: 'Listening para alertas de hot leads',
      runs_24h: 12,
      success_rate: 100,
      last_run: 'hace 14 min',
      url: 'https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU'
    },
    {
      name: 'Google Drive',
      role: 'Repositorio de listas, ofertas y catálogos',
      icon: '▲',
      color: '#0F9D58',
      status: 'online',
      current_task: 'Watching folder global research v1 perplexity',
      runs_24h: 18,
      success_rate: 100,
      last_run: 'hace 6 min',
      url: 'https://drive.google.com/drive/folders/1e48ZJaKlnGbYIFEuPhu2RnLFzjLS5p3R'
    },
    {
      name: 'n8n · self-hosted',
      role: '10 workflows automatizados · Hetzner VPS',
      icon: '⚡',
      color: '#EA4B71',
      status: 'online',
      current_task: 'Workflow Daily Lead Scoring corriendo',
      runs_24h: 847,
      success_rate: 99,
      last_run: 'hace 1 min',
      url: '#workflows'
    },
    {
      name: 'Apify · Web Extraction',
      role: 'Extracción de webs y catálogos públicos',
      icon: '⊕',
      color: '#FF9F43',
      status: 'online',
      current_task: 'Run en cola: 142 sitios pendientes',
      runs_24h: 23,
      success_rate: 96,
      last_run: 'hace 18 min',
      url: 'https://console.apify.com/'
    },
    {
      name: 'Firecrawl · Deep crawl',
      role: 'Crawl semántico de prospects',
      icon: '◐',
      color: '#FB923C',
      status: 'idle',
      current_task: null,
      runs_24h: 6,
      success_rate: 100,
      last_run: 'hace 2 h',
      url: 'https://www.firecrawl.dev/'
    },
    {
      name: 'Supabase',
      role: 'Storage de matches y pricing analysis',
      icon: '◬',
      color: '#3ECF8E',
      status: 'online',
      current_task: 'INSERT batch · 35 pricing matches',
      runs_24h: 156,
      success_rate: 100,
      last_run: 'hace 30 s',
      url: 'https://supabase.com/dashboard'
    },
    {
      name: 'Wix · Trading Lead site',
      role: 'Site público y captura de leads',
      icon: '◇',
      color: '#FFE402',
      status: 'online',
      current_task: 'Form submissions activos',
      runs_24h: 4,
      success_rate: 100,
      last_run: 'hace 1 h',
      url: 'https://manage.wix.com/'
    },
    {
      name: 'Eleven Labs · TTS',
      role: 'Voz para briefs y resúmenes diarios',
      icon: '♪',
      color: '#A855F7',
      status: 'idle',
      current_task: null,
      runs_24h: 2,
      success_rate: 100,
      last_run: 'hace 8 h',
      url: 'https://elevenlabs.io/'
    }
  ],

  activity: [
    { agent: 'Computer · Perplexity', action: 'Generó 35 pricing matches Heineman ↔ Pesco con 32 oportunidades de margen', time: 'hace 2 min', color: '#3B82F6' },
    { agent: 'Supabase', action: 'INSERT batch de 35 filas en tabla pricing_matches', time: 'hace 30 s', color: '#3ECF8E' },
    { agent: 'n8n · workflow_lead_scoring', action: 'Re-scoring completo de 696 prospects · 24 nuevos hot leads detectados', time: 'hace 1 min', color: '#EA4B71' },
    { agent: 'Slack · Tradinglead', action: 'Posted en #general-tradinglead: "24 hot leads listos para outreach"', time: 'hace 14 min', color: '#4A154B' },
    { agent: 'Google Drive', action: 'Detectó nuevo archivo: Posh_Stock_List_Apr28.xlsx · 200 SKUs', time: 'hace 6 min', color: '#0F9D58' },
    { agent: 'Apify', action: 'Extracción finalizada: 38 wholesalers en Egypt + Morocco', time: 'hace 18 min', color: '#FF9F43' },
    { agent: 'HubSpot CRM', action: 'Esperando webhook de carga inicial · 0/108 leads sincronizados', time: 'hace 1 h', color: '#FF7A59' },
    { agent: 'Firecrawl', action: 'Deep crawl de wiseinternationalfzc.com · 14 productos catalogados', time: 'hace 2 h', color: '#FB923C' }
  ],

  queue: [
    { when: 'En 5 min', agent: 'Computer', task: 'Procesar nuevo stocklist Posh Perfumes Apr28', color: '#3B82F6' },
    { when: 'En 12 min', agent: 'n8n', task: 'Workflow Daily Brief · resumen para Slack 14:00 SAST', color: '#EA4B71' },
    { when: 'En 30 min', agent: 'HubSpot', task: 'Sync inicial 108 leads desde ALL_Leads_Unified_v2', color: '#FF7A59' },
    { when: 'En 1 h', agent: 'Apify', task: 'Run scheduled: 142 wholesalers Asia + LATAM', color: '#FF9F43' },
    { when: 'Hoy 18:00', agent: 'Eleven Labs', task: 'Generar audio brief diario · 3 min duración', color: '#A855F7' },
    { when: 'Mañana 08:00', agent: 'n8n', task: 'Workflow weekly_pricing_report · margen vs competencia', color: '#EA4B71' },
    { when: 'Mañana 09:00', agent: 'Computer', task: 'Re-score completo · 696 prospects + 108 leads', color: '#3B82F6' }
  ],

  workflows: [
    {
      name: 'Lead Discovery → CRM',
      desc: 'Apify scrapes → Computer enriquece → HubSpot sync',
      agents: ['Apify', 'Computer', 'HubSpot'],
      last_run: 'hace 18 min',
      runs_24h: 24,
      success_rate: 96,
      status: 'ok',
      url: '#workflows'
    },
    {
      name: 'Pricing Intelligence',
      desc: 'Heineman + Pesco + offers → match → Supabase',
      agents: ['Computer', 'Drive', 'Supabase'],
      last_run: 'hace 2 min',
      runs_24h: 12,
      success_rate: 100,
      status: 'running',
      url: '#home'
    },
    {
      name: 'Hot Lead Alert',
      desc: 'Score ≥80 → Slack notification → HubSpot task',
      agents: ['n8n', 'Slack', 'HubSpot'],
      last_run: 'hace 14 min',
      runs_24h: 47,
      success_rate: 100,
      status: 'ok',
      url: 'https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU'
    },
    {
      name: 'Stocklist Ingestion',
      desc: 'Drive watcher → parse Excel → match catalog → matches calientes',
      agents: ['Drive', 'Computer', 'Supabase'],
      last_run: 'hace 6 min',
      runs_24h: 18,
      success_rate: 100,
      status: 'ok',
      url: '#listas'
    },
    {
      name: 'Daily Brief',
      desc: 'Resumen agregado → Slack canvas → audio brief',
      agents: ['Computer', 'Slack', 'Eleven Labs'],
      last_run: 'hace 8 h',
      runs_24h: 1,
      success_rate: 100,
      status: 'idle',
      url: 'https://app.slack.com/client/T0B05EVQ19A/C0B08DKCUBU'
    },
    {
      name: 'Web Form → CRM',
      desc: 'Wix form submit → Computer cualifica → HubSpot contact',
      agents: ['Wix', 'Computer', 'HubSpot'],
      last_run: 'hace 1 h',
      runs_24h: 4,
      success_rate: 100,
      status: 'ok',
      url: 'https://app.hubspot.com/contacts/148358528/'
    }
  ]
};
