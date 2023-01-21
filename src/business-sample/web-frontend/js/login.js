window.addEventListener('load', onLoad);

function onLoad() {
  validateSession();
}

function navigateToWelcome() {
  window.location.href = '/web-frontend/welcome.html';
}

function validateSession() {
  $.ajax({
    url: '/web-backend/session/validate',
    method: 'GET',
    dataType: 'json',
  })
    .done(function (data, textStatus, jqXHR) {
      console.log('Validate session result: %s', JSON.stringify(data));

      if (data.authorized) {
        navigateToWelcome();
      }
    });
}
