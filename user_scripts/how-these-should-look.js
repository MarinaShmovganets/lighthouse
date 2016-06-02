new Promise(function(resolve, reject) {

  // do something

  if (done) {
    resolve();
  } if (something_broke) {
    reject();
  }
});
