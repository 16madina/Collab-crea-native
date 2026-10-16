// Complète app.json. Le fichier Firebase Android (google-services.json) n'est pas dans GitHub :
// en local il est à la racine du projet ; sur EAS, il est fourni par la variable de type fichier
// GOOGLE_SERVICES_JSON (eas env:create --type file --name GOOGLE_SERVICES_JSON).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
