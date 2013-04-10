/**
 * untar.js
 *
 * Copyright(c) 2011 Google Inc.
 *
 * Reference Documentation:
 *
 * TAR format: http://www.gnu.org/software/automake/manual/tar/Standard.html
 */

var Untar = (function () {

  var Untar = function (arrayBuffer) {

    var self = this;

    // Helper functions.
    var postFile = function (localfile) {
      if (self.onfile)
        self.onfile(localfile);
    }
    var postEnd = function (localfiles) {
      if (self.onend)
        self.onend(localfiles);
    }
    var info = function () {
      // console.log.apply(console, arguments);
    }

    // Removes all characters from the first zero-byte in the string onwards.
    var readCleanString = function(bstr, numBytes) {
      var str = bstr.readString(numBytes);
      var zIndex = str.indexOf(String.fromCharCode(0));
      return zIndex != -1 ? str.substr(0, zIndex) : str;
    };

    // takes a ByteStream and parses out the local file information
    var TarLocalFile = function(bstream) {
      this.isValid = false;

      // Read in the header block
      this.name = readCleanString(bstream, 100);
      this.mode = readCleanString(bstream, 8);
      this.uid = readCleanString(bstream, 8);
      this.gid = readCleanString(bstream, 8);
      this.size = parseInt(readCleanString(bstream, 12), 8);
      this.mtime = readCleanString(bstream, 12);
      this.chksum = readCleanString(bstream, 8);
      this.typeflag = parseInt(readCleanString(bstream, 1), 8);
      this.linkname = readCleanString(bstream, 100);
      this.maybeMagic = readCleanString(bstream, 6);

      if (this.maybeMagic.trim() == "ustar") {
      	this.version = readCleanString(bstream, 2);
      	this.uname = readCleanString(bstream, 32);
      	this.gname = readCleanString(bstream, 32);
      	this.devmajor = readCleanString(bstream, 8);
      	this.devminor = readCleanString(bstream, 8);
      	this.prefix = readCleanString(bstream, 155);

      	if (this.prefix.length) {
          this.name = this.prefix + this.name;
      	}
      	bstream.readBytes(12); // 512 - 500
      } else {
      	bstream.readBytes(255); // 512 - 257
      }
      
      // Done header, now rest of blocks are the file contents.
      this.filename = this.name;
      this.fileData = null;

      info("Untarring file '" + this.filename + "'");
      info("  size = " + this.size);
      info("  typeflag = " + this.typeflag);

      // A regular file.
      if (this.typeflag == 0) {
      	info("  This is a regular file.");
      	this.fileData = new Uint8Array(bstream.bytes.buffer, bstream.ptr, this.size);
        if (this.name.length > 0 && this.size > 0 && this.fileData && this.fileData.buffer) {
          this.isValid = true;
      	}

        bstream.readBytes(this.size);

      	// Round up to 512-byte blocks.
      	var remaining = 512 - this.size % 512;
      	if (remaining > 0 && remaining < 512) {
          bstream.readBytes(remaining);
      	}
      } else if (this.typeflag == 5) {
      	 info("  This is a directory.")
      }
    };

    // Takes an ArrayBuffer of a tar file in
    // returns null on error
    // returns an array of DecompressedFile objects on success
    var untar = function(arrayBuffer) {

      var bstream = new bitjs.io.ByteStream(arrayBuffer);
      var localFiles = [];

      // While we don't encounter an empty block, keep making TarLocalFiles.
      while (bstream.peekNumber(4) != 0) {
      	var localFile = new TarLocalFile(bstream);
      	if (localFile && localFile.isValid) {
          localFiles.push(localFile);
          postFile(localFile);
      	}
      }

      postEnd(localFiles);
    };

    this.start = function () {
      untar(arrayBuffer);
    }

  }

  return Untar;

})();
