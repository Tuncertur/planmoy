import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Lang = 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ar' | 'ru' | 'zh'
export const languages: { value: Lang; label: string }[] = [
  { value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' }, { value: 'es', label: 'Español' }, { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' }, { value: 'zh', label: '中文' },
]
export const locales: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', ru: 'ru-RU', zh: 'zh-CN' }

type Phrase = [string, string, string, string, string, string, string, string]
// Shared UI vocabulary. Legacy route copy is translated through this compatibility layer too,
// so a language switch applies consistently before each module is fully componentized.
const phrases: Phrase[] = [
  ['Ana akış','Overview','Übersicht','Vue d’ensemble','Resumen','نظرة عامة','Обзор','总览'], ['Akışım','My flow','Mein Ablauf','Mon flux','Mi flujo','مساري','Мой поток','我的流程'],
  ['Zaman akışı','Time flow','Zeitablauf','Flux du temps','Flujo de tiempo','تدفق الوقت','Расписание','时间安排'], ['Takvim','Calendar','Kalender','Calendrier','Calendario','التقويم','Календарь','日历'],
  ['Yapılacaklar','Tasks','Aufgaben','Tâches','Tareas','المهام','Задачи','待办事项'], ['Keşfet','Discover','Entdecken','Découvrir','Descubrir','اكتشف','Открытия','探索'],
  ['Hobi ve hedefler','Hobbies & goals','Hobbys & Ziele','Loisirs et objectifs','Aficiones y metas','الهوايات والأهداف','Хобби и цели','兴趣与目标'], ['İlgi alanlarım','My interests','Meine Interessen','Mes centres d’intérêt','Mis intereses','اهتماماتي','Мои интересы','我的兴趣'],
  ['Boş Alan','Open space','Freiraum','Espace libre','Espacio libre','مساحة فارغة','Свободное пространство','留白空间'], ['Yapay zeka','AI','KI','IA','IA','الذكاء الاصطناعي','ИИ','人工智能'],
  ['Kişisel araçlar','Personal tools','Persönliche Werkzeuge','Outils personnels','Herramientas personales','الأدوات الشخصية','Личные инструменты','个人工具'], ['Spor akışı','Fitness flow','Sportablauf','Flux sport','Flujo deportivo','التدريب','Спорт','运动流程'],
  ['Kişisel alan','Personal space','Persönlicher Bereich','Espace personnel','Espacio personal','المساحة الشخصية','Личное пространство','个人空间'], ['İşletme alanı','Business space','Unternehmensbereich','Espace entreprise','Espacio para negocios','مساحة الأعمال','Для бизнеса','企业空间'],
  ['Genel bakış','Overview','Übersicht','Vue d’ensemble','Resumen','نظرة عامة','Обзор','总览'], ['Akışına dön','Back to my flow','Zu meinem Ablauf','Retour à mon flux','Volver a mi flujo','العودة إلى مساري','Вернуться к потоку','返回我的流程'],
  ['Giriş yap','Sign in','Anmelden','Se connecter','Iniciar sesión','تسجيل الدخول','Войти','登录'], ['Hesap oluştur','Create account','Konto erstellen','Créer un compte','Crear cuenta','إنشاء حساب','Создать аккаунт','创建账户'],
  ['Randevu ekle','Add appointment','Termin hinzufügen','Ajouter un rendez-vous','Añadir cita','إضافة موعد','Добавить встречу','添加预约'], ['Randevu oluştur','Create appointment','Termin erstellen','Créer un rendez-vous','Crear cita','إنشاء موعد','Создать встречу','创建预约'],
  ['Bugün','Today','Heute','Aujourd’hui','Hoy','اليوم','Сегодня','今天'], ['Hafta','Week','Woche','Semaine','Semana','الأسبوع','Неделя','周'], ['Ay','Month','Monat','Mois','Mes','الشهر','Месяц','月'],
  ['Kaydet','Save','Speichern','Enregistrer','Guardar','حفظ','Сохранить','保存'], ['Ekle','Add','Hinzufügen','Ajouter','Añadir','إضافة','Добавить','添加'], ['Sil','Delete','Löschen','Supprimer','Eliminar','حذف','Удалить','删除'],
  ['Ara','Search','Suchen','Rechercher','Buscar','بحث','Поиск','搜索'], ['Not yaz','Write a note','Notiz schreiben','Écrire une note','Escribir una nota','اكتب ملاحظة','Написать заметку','写笔记'], ['Yeni not','New note','Neue Notiz','Nouvelle note','Nueva nota','ملاحظة جديدة','Новая заметка','新建笔记'],
  ['Kişisel alan','Personal area','Persönlicher Bereich','Espace personnel','Área personal','المساحة الشخصية','Личная область','个人区域'], ['İşletme paneli','Business panel','Unternehmenspanel','Panneau entreprise','Panel del negocio','لوحة الأعمال','Панель бизнеса','企业面板'],
  ['Öncelikli konu','Priority topic','Prioritätsthema','Sujet prioritaire','Tema prioritario','الموضوع ذو الأولوية','Приоритетная тема','优先主题'], ['Kategori rehberi','Category guide','Kategorie-Leitfaden','Guide des catégories','Guía de categorías','دليل الفئات','Каталог категорий','分类指南'],
  ['Randevu detayına giriş yap.','Sign in to view appointment details.','Melde dich an, um Termindetails zu sehen.','Connectez-vous pour voir les détails.','Inicia sesión para ver los detalles.','سجّل الدخول لرؤية تفاصيل الموعد.','Войдите, чтобы увидеть детали встречи.','登录以查看预约详情。'],
  ['Henüz mesaj yok.','No messages yet.','Noch keine Nachrichten.','Aucun message pour le moment.','Aún no hay mensajes.','لا توجد رسائل بعد.','Сообщений пока нет.','暂无消息。'], ['Onayla','Confirm','Bestätigen','Confirmer','Confirmar','تأكيد','Подтвердить','确认'], ['İptal et','Cancel','Stornieren','Annuler','Cancelar','إلغاء','Отменить','取消'],
  ['Tamamlandı','Completed','Erledigt','Terminé','Completado','مكتمل','Выполнено','已完成'], ['Beklemede','Pending','Ausstehend','En attente','Pendiente','قيد الانتظار','Ожидает','待处理'], ['Onaylı','Confirmed','Bestätigt','Confirmé','Confirmado','مؤكد','Подтверждено','已确认'],
  ['Güvenlik ve kontrol','Security & control','Sicherheit & Kontrolle','Sécurité et contrôle','Seguridad y control','الأمان والتحكم','Безопасность и контроль','安全与控制'], ['Çıkış yap','Sign out','Abmelden','Se déconnecter','Cerrar sesión','تسجيل الخروج','Выйти','退出'],
  ['Planmoy · kişisel plan','Planmoy · personal plan','Planmoy · persönlicher Plan','Planmoy · plan personnel','Planmoy · plan personal','Planmoy · الخطة الشخصية','Planmoy · личный план','Planmoy · 个人计划'],
  ['Hesap','Account','Konto','Compte','Cuenta','الحساب','Аккаунт','账户'], ['Kişisel plan','Personal plan','Persönlicher Plan','Plan personnel','Plan personal','الخطة الشخصية','Личный план','个人计划'],
  ['Haftalık görünüm','Weekly view','Wochenansicht','Vue hebdomadaire','Vista semanal','العرض الأسبوعي','Недельный вид','周视图'], ['Takvim yönetimi','Calendar management','Kalenderverwaltung','Gestion du calendrier','Gestión del calendario','إدارة التقويم','Управление календарём','日历管理'],
  ['Hatırlatıcılar','Reminders','Erinnerungen','Rappels','Recordatorios','التذكيرات','Напоминания','提醒'], ['Takvimine alarm kur','Set a calendar reminder','Kalendererinnerung setzen','Créer un rappel','Configurar un recordatorio','أنشئ تذكيراً في التقويم','Установить напоминание','设置日历提醒'],
  ['Kişisel alan','Personal area','Persönlicher Bereich','Espace personnel','Área personal','المساحة الشخصية','Личная область','个人区域'], ['Ruh, bütçe ve öğrenme','Mood, budget & learning','Stimmung, Budget & Lernen','Humeur, budget et apprentissage','Ánimo, presupuesto y aprendizaje','المزاج والميزانية والتعلم','Настроение, бюджет и обучение','情绪、预算与学习'],
  ['Kişisel bakım','Personal care','Persönliche Pflege','Soins personnels','Cuidado personal','العناية الشخصية','Личный уход','个人护理'], ['Kişisel profil','Personal profile','Persönliches Profil','Profil personnel','Perfil personal','الملف الشخصي','Личный профиль','个人资料'],
  ['Yeni görev ekle','Add a new task','Neue Aufgabe hinzufügen','Ajouter une tâche','Añadir una tarea','إضافة مهمة جديدة','Добавить задачу','添加新任务'], ['Görev ekle','Add task','Aufgabe hinzufügen','Ajouter une tâche','Añadir tarea','إضافة مهمة','Добавить задачу','添加任务'],
  ['Randevu detayları','Appointment details','Termindetails','Détails du rendez-vous','Detalles de la cita','تفاصيل الموعد','Детали встречи','预约详情'], ['Güvenli mesajlar','Secure messages','Sichere Nachrichten','Messages sécurisés','Mensajes seguros','رسائل آمنة','Безопасные сообщения','安全消息'],
  ['Arama yarıçapı','Search radius','Suchradius','Rayon de recherche','Radio de búsqueda','نطاق البحث','Радиус поиска','搜索半径'], ['Konumumu kullan','Use my location','Meinen Standort verwenden','Utiliser ma position','Usar mi ubicación','استخدم موقعي','Использовать моё местоположение','使用我的位置'],
  ['Not defteri','Notebook','Notizbuch','Carnet de notes','Cuaderno','دفتر الملاحظات','Блокнот','笔记本'], ['Notlarda ara','Search notes','Notizen durchsuchen','Rechercher dans les notes','Buscar en notas','البحث في الملاحظات','Поиск в заметках','搜索笔记'],
  ['Kombin öner','Suggest an outfit','Outfit vorschlagen','Suggérer une tenue','Sugerir un conjunto','اقترح إطلالة','Предложить образ','推荐穿搭'], ['Parça adı','Item name','Artikelname','Nom de l’article','Nombre de la prenda','اسم القطعة','Название вещи','单品名称'],
  ['Kategori rehberi','Category guide','Kategorie-Leitfaden','Guide des catégories','Guía de categorías','دليل الفئات','Каталог категорий','分类指南'],
  ['Etkinlikler','Events','Veranstaltungen','Événements','Eventos','الفعاليات','События','活动'],
  ['Spor akışı','Sports flow','Sportablauf','Flux sportif','Flujo deportivo','تدفق الرياضة','Спортивный поток','运动流程'],
  ['Akışını netleştir.','Clarify your flow.','Kläre deinen Ablauf.','Clarifiez votre flux.','Aclara tu flujo.','وضّح مسارك.','Проясните свой поток.','理清你的流程。'],
  ['Kişisel çalışma alanı','Personal workspace','Persönlicher Arbeitsbereich','Espace de travail personnel','Espacio de trabajo personal','مساحة العمل الشخصية','Личное рабочее пространство','个人工作空间'],
  ['Menüde ara','Search the menu','Menü durchsuchen','Rechercher dans le menu','Buscar en el menú','البحث في القائمة','Поиск в меню','搜索菜单'],
  ['Sonuç yok','No results','Keine Ergebnisse','Aucun résultat','Sin resultados','لا توجد نتائج','Нет результатов','没有结果'],
  ['Önceki ekrana dön','Back to previous screen','Zurück zum vorherigen Bildschirm','Retour à l’écran précédent','Volver a la pantalla anterior','العودة إلى الشاشة السابقة','Вернуться к предыдущему экрану','返回上一页'],
  ['Hızlı gezinme','Quick navigation','Schnellnavigation','Navigation rapide','Navegación rápida','تنقل سريع','Быстрая навигация','快速导航'],
  ['İstanbul · 19°','Istanbul · 19°','Istanbul · 19°','Istanbul · 19°','Estambul · 19°','إسطنبول · 19°','Стамбул · 19°','伊斯坦布尔 · 19°'],
  ['Akışını tek bakışta netleştir.','Clarify your flow at a glance.','Kläre deinen Ablauf auf einen Blick.','Clarifiez votre flux en un coup d’œil.','Aclara tu flujo de un vistazo.','وضّح مسارك بنظرة واحدة.','Проясните свой поток одним взглядом.','一眼理清你的安排。'],
  ['Yaklaşan randevu yok','No upcoming appointments','Keine bevorstehenden Termine','Aucun rendez-vous à venir','No hay citas próximas','لا توجد مواعيد قادمة','Нет предстоящих встреч','暂无即将到来的预约'],
  ['İlki','First','Erster','Premier','Primero','الأول','Первый','第一项'],
  ['Onaylı randevu','Confirmed appointment','Bestätigter Termin','Rendez-vous confirmé','Cita confirmada','موعد مؤكد','Подтверждённая встреча','已确认的预约'],
  ['Randevu','Appointment','Termin','Rendez-vous','Cita','موعد','Встреча','预约'],
  ['Yeni randevu ekle','Add new appointment','Neuen Termin hinzufügen','Ajouter un rendez-vous','Añadir una cita','إضافة موعد جديد','Добавить встречу','添加预约'],
  ['Programın dengeli görünüyor. Randevularının arasında kendine alan bırakmışsın.','Your schedule looks balanced. You have left room for yourself between appointments.','Dein Zeitplan wirkt ausgeglichen. Zwischen den Terminen bleibt Zeit für dich.','Ton agenda semble équilibré. Tu as gardé du temps pour toi entre les rendez-vous.','Tu agenda parece equilibrida. Has dejado espacio para ti entre las citas.','يبدو جدولك متوازناً. لقد تركت وقتاً لنفسك بين المواعيد.','Ваш график выглядит сбалансированным. Между встречами осталось время для себя.','你的日程安排很平衡，预约之间留出了属于自己的时间。'],
  ['Sağlık randevuları','Health appointments','Gesundheitstermine','Rendez-vous de santé','Citas de salud','مواعيد صحية','Медицинские встречи','健康预约'],
  ['Bakım planı','Care plan','Pflegeplan','Plan de soins','Plan de cuidado','خطة العناية','План ухода','护理计划'],
  ['Akıllı öneriler','Smart suggestions','Intelligente Vorschläge','Suggestions intelligentes','Sugerencias inteligentes','اقتراحات ذكية','Умные рекомендации','智能建议'],
  ['Görüşmelerini düzenle','Organize your appointments','Organisiere deine Termine','Organisez vos rendez-vous','Organiza tus citas','نظّم مواعيدك','Организуйте встречи','整理你的预约'],
  ['Stil ve kuaför','Style and hair','Stil und Friseur','Style et coiffure','Estilo y peluquería','الأناقة وتصفيف الشعر','Стиль и уход за волосами','风格与美发'],
  ['Bugünü birlikte planla','Plan today together','Plane den Tag gemeinsam','Planifiez la journée ensemble','Planifica hoy juntos','خطّط لليوم معاً','Спланируйте день вместе','一起规划今天'],
  ['Hayatının akışı, tek noktada.','One clear flow for life.','Ein klarer Ablauf fürs Leben.','Un flux clair pour votre vie.','Un flujo claro para tu vida.','تدفق واضح لحياتك.','Один ясный поток для жизни.','让生活拥有清晰的节奏。'],
]
const table: Record<Lang, Record<string, string>> = Object.fromEntries(languages.map((l, i) => [l.value, Object.fromEntries(phrases.map(p => [p[0], p[i]]))])) as Record<Lang, Record<string, string>>
const I18nContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: (value: string) => string; locale: string }>({ lang: 'tr', setLang: () => {}, t: value => value, locale: locales.tr })
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr')
  useEffect(() => { const saved = window.localStorage.getItem('planmoy-language') as Lang | null; if (saved && table[saved]) setLangState(saved) }, [])
  const setLang = (next: Lang) => { setLangState(next); window.localStorage.setItem('planmoy-language', next) }
  const value = useMemo(() => ({ lang, setLang, t: (value: string) => table[lang][value] ?? value, locale: locales[lang] }), [lang])
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr' }, [lang])
  return <I18nContext.Provider value={value}><LegacyTextTranslator lang={lang} />{children}</I18nContext.Provider>
}
export function useI18n() { return useContext(I18nContext) }
function LegacyTextTranslator({ lang }: { lang: Lang }) {
  useEffect(() => {
    const translate = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []; let node: Node | null
      while ((node = walker.nextNode())) { if (node.parentElement && !['SCRIPT','STYLE','OPTION'].includes(node.parentElement.tagName)) nodes.push(node as Text) }
      nodes.forEach(text => { const raw = text.nodeValue ?? ''; const trimmed = raw.trim(); const translated = table[lang][trimmed]; if (translated) text.nodeValue = raw.replace(trimmed, translated) })
      document.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]').forEach(el => { for (const attr of ['placeholder','aria-label','title']) { const value = el.getAttribute(attr); if (value && table[lang][value]) el.setAttribute(attr, table[lang][value]) } })
    }
    const timer = window.setTimeout(translate, 0)
    const observer = new MutationObserver(() => window.setTimeout(translate, 0)); observer.observe(document.body, { childList: true, subtree: true }); return () => { window.clearTimeout(timer); observer.disconnect() }
  }, [lang])
  return null
}
export function LanguageSelect({ compact = false }: { compact?: boolean }) { const { lang } = useI18n(); const labels: Record<Lang, string> = { tr:'Dil', en:'Language', de:'Sprache', fr:'Langue', es:'Idioma', ar:'اللغة', ru:'Язык', zh:'语言' }; const label = compact ? '文' : labels[lang]; return <label className="language-picker"><span>{label}</span><select value={lang} onChange={e => { window.localStorage.setItem('planmoy-language', e.target.value); window.location.reload() }} aria-label={label}><option value="tr">TR</option><option value="en">EN</option><option value="de">DE</option><option value="fr">FR</option><option value="es">ES</option><option value="ar">AR</option><option value="ru">РУ</option><option value="zh">中文</option></select></label> }
