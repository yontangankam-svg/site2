// 📊 SYSTÈME DE SUIVI DES CLICS ET RÉPONSES
// Collecte les données sans nécessiter de backend

class LinkTracker {
  constructor() {
    this.data = this.loadData();
  }

  // Charger les données depuis localStorage
  loadData() {
    const stored = localStorage.getItem('siteTracker');
    return stored ? JSON.parse(stored) : {
      clicks: [],
      responses: [],
      userSessions: []
    };
  }

  // Sauvegarder les données dans localStorage
  saveData() {
    localStorage.setItem('siteTracker', JSON.stringify(this.data));
    // Envoyer aussi à un serveur si disponible
    this.syncToServer();
  }

  // Générer un ID de session unique
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Créer une nouvelle session utilisateur
  createSession() {
    const session = {
      id: this.generateSessionId(),
      startTime: new Date().toISOString(),
      endTime: null,
      userAgent: navigator.userAgent,
      language: navigator.language,
      events: []
    };
    this.data.userSessions.push(session);
    sessionStorage.setItem('currentSession', JSON.stringify(session));
    return session;
  }

  // Tracker un clic sur un lien
  trackClick(linkName, linkUrl = null) {
    const session = JSON.parse(sessionStorage.getItem('currentSession') || '{}');
    
    const click = {
      timestamp: new Date().toISOString(),
      linkName: linkName,
      linkUrl: linkUrl,
      sessionId: session.id || null,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };
    
    this.data.clicks.push(click);
    
    // Ajouter à la session courante
    if (session.id) {
      session.events.push({
        type: 'click',
        data: click,
        timestamp: new Date().toISOString()
      });
      sessionStorage.setItem('currentSession', JSON.stringify(session));
    }
    
    this.saveData();
    console.log('✅ Clic enregistré:', linkName);
  }

  // Tracker une réponse (choix utilisateur)
  trackResponse(step, responseData) {
    const session = JSON.parse(sessionStorage.getItem('currentSession') || '{}');
    
    const response = {
      timestamp: new Date().toISOString(),
      step: step,
      data: responseData,
      sessionId: session.id || null
    };
    
    this.data.responses.push(response);
    
    // Ajouter à la session courante
    if (session.id) {
      session.events.push({
        type: 'response',
        data: response,
        timestamp: new Date().toISOString()
      });
      sessionStorage.setItem('currentSession', JSON.stringify(session));
    }
    
    this.saveData();
    console.log('✅ Réponse enregistrée:', step, responseData);
  }

  // Sync vers un serveur (Discord webhook, Firebase, etc.)
  syncToServer() {
    // Option 1: Discord Webhook (à configurer)
    const discordWebhook = localStorage.getItem('discordWebhook');
    if (discordWebhook && Math.random() < 0.1) { // 10% des fois pour ne pas surcharger
      this.sendToDiscord(discordWebhook);
    }
    
    // Option 2: Serveur personnalisé (à configurer)
    const apiUrl = localStorage.getItem('apiUrl');
    if (apiUrl) {
      this.sendToApi(apiUrl);
    }
  }

  // Envoyer vers Discord
  sendToDiscord(webhookUrl) {
    const lastClick = this.data.clicks[this.data.clicks.length - 1];
    const lastResponse = this.data.responses[this.data.responses.length - 1];
    
    let message = '📊 **Nouvelle interaction sur le site**\n\n';
    if (lastClick) {
      message += `**Clic:** ${lastClick.linkName}\n`;
      message += `**Heure:** ${new Date(lastClick.timestamp).toLocaleString('fr-FR')}\n`;
    }
    if (lastResponse) {
      message += `**Réponse:** ${lastResponse.step}\n`;
      message += `**Données:** ${JSON.stringify(lastResponse.data)}\n`;
    }
    
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: '🔔 Site Tracker'
      })
    }).catch(() => {}); // Silencieux en cas d'erreur
  }

  // Envoyer vers API personnalisée
  sendToApi(apiUrl) {
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clicks: this.data.clicks,
        responses: this.data.responses,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  }

  // Obtenir les statistiques
  getStats() {
    return {
      totalClicks: this.data.clicks.length,
      totalResponses: this.data.responses.length,
      totalSessions: this.data.userSessions.length,
      topLinks: this.getTopLinks(),
      topLocations: this.getTopLocations(),
      clicksByHour: this.getClicksByHour()
    };
  }

  // Les liens les plus cliqués
  getTopLinks() {
    const links = {};
    this.data.clicks.forEach(click => {
      links[click.linkName] = (links[click.linkName] || 0) + 1;
    });
    return Object.entries(links)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  // Les lieux les plus choisis
  getTopLocations() {
    const locations = {};
    this.data.responses.forEach(r => {
      if (r.step === 'step4' && r.data.location) {
        const loc = r.data.location;
        locations[loc] = (locations[loc] || 0) + 1;
      }
    });
    return Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  // Clics par heure
  getClicksByHour() {
    const hours = {};
    this.data.clicks.forEach(click => {
      const hour = new Date(click.timestamp).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    return hours;
  }

  // Exporter les données (pour télécharger)
  exportData() {
    const csv = this.convertToCsv();
    this.downloadCsv(csv, `tracker-export-${new Date().toISOString().slice(0,10)}.csv`);
  }

  // Convertir en CSV
  convertToCsv() {
    let csv = 'Timestamp,Type,Données\n';
    this.data.clicks.forEach(click => {
      csv += `"${click.timestamp}","Clic","${click.linkName}"\n`;
    });
    this.data.responses.forEach(response => {
      csv += `"${response.timestamp}","Réponse","${response.step}: ${JSON.stringify(response.data)}"\n`;
    });
    return csv;
  }

  // Télécharger CSV
  downloadCsv(csv, filename) {
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = filename;
    link.click();
  }

  // Réinitialiser les données
  resetData() {
    if (confirm('⚠️ Êtes-vous sûr ? Cela effacera TOUTES les données !')) {
      this.data = { clicks: [], responses: [], userSessions: [] };
      this.saveData();
      console.log('🗑️ Données réinitialisées');
    }
  }
}

// 🚀 Initialiser le tracker
const tracker = new LinkTracker();

// Créer une nouvelle session au chargement
window.addEventListener('load', () => {
  tracker.createSession();
  console.log('📊 Session de tracking lancée');
});
