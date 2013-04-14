importScripts(
  "libs/deflate.min.js",
  "libs/inflate.min.js",
  "libs/bitjs-io.js",
  "libs/untar.js",
  "libs/png.js"
);

var URL = this.URL ? this.URL : this.webkitURL;

self.onmessage = function (event) {

  var xhr = new XMLHttpRequest();
  xhr.onload = function () {

    var rawPngData, meta;

    var finish = function () {
      if (rawPngData && meta) {

        var decodedImageData = PNG.decode(rawPngData);

        var croppedImages = new Array(meta.imageCount);
        var i = 0;
        for (var y = 0; y < decodedImageData.height; y += meta.imageHeight)
          for (var x = 0; x < decodedImageData.width; x += meta.imageWidth)
            if (i < meta.imageCount) {
              croppedImages[i] = PNG.cropImage(decodedImageData, x, y, meta.imageWidth, meta.imageHeight);
              i++;
            }

        try {
          var croppedImageArrayBuffers = croppedImages.map(function (a) { return a.data.buffer; });
          self.postMessage(croppedImages, croppedImageArrayBuffers);
        } catch (ex) {
          self.postMessage(croppedImages);
        }
      }
    }

    var untar = new Untar(xhr.response);
    untar.onfile = function (file) {

      if (file.filename == "output.png") {

        rawPngData = new Uint8Array(file.fileData);

        finish();

      }

      if (file.filename == "meta.json") {

        var blob = new Blob([ file.fileData ], { type : "application/json" });

        if (blob.size == 19 && file.fileData != 19) {

          // Safari doesn't do well with blobs in workers.
          var temp = [];

          var fileData = file.fileData;
          for(var i = 0; i < fileData.length; i++) {
            temp[i] = String.fromCharCode(fileData[i]);
          }

          meta = JSON.parse(temp.join("")); 
          finish();

        } else {

          var blobURL = URL.createObjectURL(blob);
          
          var metaXHR = new XMLHttpRequest();
          metaXHR.onload = function () {
            URL.revokeObjectURL(blobURL);
            meta = JSON.parse(metaXHR.responseText);

            finish();
          }
          metaXHR.open("GET", blobURL, true);
          metaXHR.send();
          
        }

      }

    }
    untar.start();
    
  }
  xhr.responseType = "arraybuffer"; 
  xhr.open("get", event.data, true);
  xhr.send();

};