window.addEventListener('load', onLoad);

function onLoad() {
  $('#btnLogout').click(logout);

  if (checkAuthorizedCookie()) {
    console.log('Authorized cookie detected, display username.');

    displaySessionUser();

  } else {
    console.log('Authorized cookie is not found, redirect to login page.');

    navigateToLogin();
  }
}

function navigateToLogin() {
  window.location.href = '/web-frontend/login.html';
}

function checkAuthorizedCookie() {
  const cookies = document.cookie.split('; ');
  return cookies.includes('authorized=1');
}

function setUsername(username) {
  $('#lblUsername').text(username);
}

function displaySessionUser() {
  $.ajax({
    url: '/web-backend/session/user',
    method: 'GET',
    dataType: 'json',
  })
    .done(function (data, textStatus, jqXHR) {
      console.log('Session user: %s', JSON.stringify(data));
      setUsername(data.username);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error('Get session user failed. %s', errorThrown);

      if (jqXHR.status === 401) {
        console.log('Unauthorized session, redirect to login page.');
        navigateToLogin();
      }
    });
}

function logout() {
  $.ajax({
    url: '/web-backend/session/logout',
    method: 'DELETE',
  })
    .done(function (data, textStatus, jqXHR) {
      console.log('Logout successfully, redirect to login page.');
      navigateToLogin();
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error('Logout failed. %s', errorThrown);
    })
}
