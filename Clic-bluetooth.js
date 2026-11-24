(() => {
  'use strict';

  const SERVICE_UUID =
    '8c4f0001-5a9e-4f68-9c27-190aefc10001';
  const COMMANDE_UUID =
    '8c4f0002-5a9e-4f68-9c27-190aefc10001';

  let device = null;
  let characteristic = null;
  let button = null;
  let info = null;
  let dernierAppui = 0;

  function message(texte) {
    if (info) info.textContent = texte;
  }

  function actualiserBouton() {
    if (!button) return;
    button.textContent = device?.gatt?.connected
      ? 'Déconnecter mon boîtier'
      : 'Connecter mon boîtier';
  }

  function deconnexion() {
    characteristic = null;
    message('Boîtier déconnecté');
    actualiserBouton();
  }

  function reception(event) {
    const valeur = event.target.value;
    const commande = new TextDecoder()
      .decode(valeur)
      .trim();

    if (commande !== 'START') return;

    if (Date.now() - dernierAppui < 500) return;
    dernierAppui = Date.now();

    message('Bouton Clic activé !');

    try {
      if (typeof state === 'undefined') {
        message('Connexion OK, liaison au minuteur à adapter.');
        return;
      }

      if (state.pendingConfirm) {
        message('Confirme la fin de ta session.');
        return;
      }

      if (state.focus && !state.focus.done) {
        if (state.focus.paused) {
          pauseResume();
        }
        navigateTo('focus');
        return;
      }

      const tache = state.tasks.find(
        t => !t.done && !t.demo && Number(t.duration) > 0
      );

      if (tache) {
        startFocus(tache.id, tache.name, tache.duration);
        message('Session démarrée');
      } else {
        openTimer();
        message('Choisis une durée pour commencer.');
      }
    } catch (erreur) {
      console.error(erreur);
      message('Bluetooth OK, démarrage à vérifier.');
    }
  }

  async function connexion() {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
      return;
    }

    if (!navigator.bluetooth) {
      message('Utilise Chrome sur Android avec HTTPS.');
      return;
    }

    try {
      message('Recherche de Clic-Bouton...');

      device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'Clic-Bouton' }],
        optionalServices: [SERVICE_UUID]
      });

      device.addEventListener(
        'gattserverdisconnected',
        deconnexion
      );

      const serveur = await device.gatt.connect();
      const service =
        await serveur.getPrimaryService(SERVICE_UUID);

      characteristic =
        await service.getCharacteristic(COMMANDE_UUID);

      await characteristic.startNotifications();

      characteristic.addEventListener(
        'characteristicvaluechanged',
        reception
      );

      message('Boîtier connecté. Appuie sur BOOT.');
      actualiserBouton();

    } catch (erreur) {
      message('Connexion impossible : ' + erreur.message);
      actualiserBouton();
    }
  }

  function installerInterface() {
    if (document.getElementById('clic-ble-panel')) return;

    const profil = document.querySelector('#screen-profil');
    if (!profil) {
      console.warn('Section profil introuvable');
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'clic-ble-panel';
    panel.className = 'card';
    panel.style.margin = '16px 0';
    panel.style.padding = '20px';

    const titre = document.createElement('h3');
    titre.textContent = 'Mon boîtier Clic';

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.style.width = '100%';
    button.style.marginTop = '12px';
    button.addEventListener('click', connexion);

    info = document.createElement('p');
    info.textContent = 'Boîtier non connecté';
    info.style.marginTop = '12px';
    info.style.fontSize = '13px';

    panel.append(titre, button, info);
    profil.appendChild(panel);

    actualiserBouton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      installerInterface
    );
  } else {
    installerInterface();
  }
})();
