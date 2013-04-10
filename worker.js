importScripts("jpg.js", "generatepng.js", "bitjs/io.js", "bitjs/untar.js");

var URL = this.webkitURL ? this.webkitURL : this.URL;

self.onmessage = function (event) {

  var xhr = new XMLHttpRequest();
  xhr.onload = function () {

    var untar = new Untar(xhr.response);
    untar.onfile = function (file) {

      if (file.filename.substring(0, 3) == "./.") return;

      var clonedFileData = new Uint8Array(file.fileData);
      var blob = new Blob([ clonedFileData.buffer ], { type : "image/jpeg" });
      
      self.postMessage({ blob : blob, name : file.filename, size : file.size });

    }
    untar.start();
    
  }
  xhr.responseType = "arraybuffer"; 
  xhr.open("get", event.data, true);
  xhr.send();

};