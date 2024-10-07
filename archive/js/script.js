const form = document.getElementById('generate-form');
const qr = document.getElementById('qrcode');

// Button submit
const onGenerateSubmit = (e) => {
  e.preventDefault();

  clearUI();

  //const url = document.getElementById('url').value;
  //const data = document.getElementById('data').value;
  const yourTeam = document.getElementById("yourTeam").value;
  const initials = document.getElementById("initials").value;
  const teamNum = document.getElementById("teamNum").value;
  const matchNum = document.getElementById("matchNum").value;
  const robotPosition = document.getElementById("robotPosition").value;
  const noShow = document.getElementById("noShow").value;
  const exitCommunity = document.getElementById("exitCommunity").value;
  const preload = document.getElementById("preload").value;

  const autoTopsCone = document.getElementById("autoTopsCone").value;
  const autoTopsCube = document.getElementById("autoTopsCube").value;
  
  const autoMidsCone = document.getElementById("autoMidsCone").value;
  const autoMidsCube = document.getElementById("autoMidsCube").value;

  const autoLowsCone = document.getElementById("autoLowsCone").value;
  const autoLowsCube = document.getElementById("autoLowsCube").value;
  
  const autoEnd = document.getElementById("autoEnd").value;

  const teleTopsCone = document.getElementById("teleTopsCone").value;
  const teleTopsCube = document.getElementById("teleTopsCube").value;

  const teleMidsCone = document.getElementById("teleMidsCone").value;
  const teleMidsCube = document.getElementById("teleMidsCube").value;

  const teleLowsCone = document.getElementById("teleLowsCone").value;
  const teleLowsCube = document.getElementById("teleLowsCube").value;
  
  const climb = document.getElementById("climb").value;

  setTimeout(() => {
    generateQRCode(teamNum, yourTeam, initials, matchNum, robotPosition, exitCommunity, preload, climb, robotDisabled, comments);

    // Generate the save button after the qr code image src is ready
    setTimeout(() => {
      // Get save url
      const saveUrl = qr.querySelector('img').src;
      // Create save button
      createSaveBtn(saveUrl);
    }, 50);
  }, 1000);
};

// Generate QR code
const generateQRCode = (teamNum, yourTeam, initials, matchNum, robotPosition, exitCommunity, preload, climb, robotDisabled, comments) => {
  const qrcode = new QRCode('qrcode', {
    text: teamNum.concat(" ", yourTeam , " " , initials , " " , matchNum , " " , robotPosition , " " , exitCommunity , " " + preload , " " + climb , " " , robotDisabled , " " , comments),
    width: 300,
    height: 300,
  });
};

// Clear QR code and save button
const clearUI = () => {
  qr.innerHTML = '';
  const saveBtn = document.getElementById('save-link');
  if (saveBtn) {
    saveBtn.remove();
  }
};

// Create save button to download QR code as image
const createSaveBtn = (saveUrl) => {
  const link = document.createElement('a');
  link.id = 'save-link';
  link.classList =
    'bg-red-500 hover:bg-red-700 text-white font-bold py-2 rounded w-1/3 m-auto my-5';
  link.href = saveUrl;
  link.download = 'qrcode';
  link.innerHTML = 'Save Image';
  document.getElementById('generated').appendChild(link);
};

form.addEventListener('submit', onGenerateSubmit);


