
update-helper
=============

**Application Update Process Helper Utility**

<p/>
<img src="https://nodei.co/npm/update-helper.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/update-helper.png" alt=""/>

Abstract
--------

<b>Update Helper</b> is a small Application Programming Interface (API)
and corresponding underlying Command-Line Interface (CLI) for updating
an application. It is primarily intended to update a <i>packaged</i>
Electron application (consisting of a single <code>.exe</code> or
<code>.app</code> file) under Windows and macOS. The crux is that the
application cannot do this itself, as its running Electron run-time
is part of the application bundle and as long as it is running, it
cannot replace itself on the filesystem. Instead, <b>Update Helper</b>
downloads its CLI into a temporary directory and calls it to kill the
application process, replace the application file and restart the
application.

Installation
------------

$ npm install update-helper

Usage
-----

FIXME

License
-------

Copyright &copy; 2020 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

