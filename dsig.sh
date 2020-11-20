##
##  update-helper -- Application Update Process Helper Utility
##  Copyright (c) 2020 Dr. Ralf S. Engelschall <rse@engelschall.com>
##
##  Permission is hereby granted, free of charge, to any person obtaining
##  a copy of this software and associated documentation files (the
##  "Software"), to deal in the Software without restriction, including
##  without limitation the rights to use, copy, modify, merge, publish,
##  distribute, sublicense, and/or sell copies of the Software, and to
##  permit persons to whom the Software is furnished to do so, subject to
##  the following conditions:
##
##  The above copyright notice and this permission notice shall be included
##  in all copies or substantial portions of the Software.
##
##  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
##  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
##  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
##  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
##  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
##  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
##  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
##

cmd="$1"
shift
case "$cmd" in
    #   once prepare the digital signature mechanism
    prepare )
        BASEDIR=$HOME/.dsig
        mkdir -p $BASEDIR
        PACKAGE=`npx json -f package.json name`
        AUTHOR_NAME=`npx json -f package.json author.name`
        AUTHOR_EMAIL=`npx json -f package.json author.email`
        echo "++ generating secret passphrase"
        npx vpg -c 1 -l 10 \
            -i lowerletter,upperletter:2,digit:2 \
            -d homoglyph:1lOo -e homoglyph \
            >$BASEDIR/$PACKAGE.pw
        echo "++ generating private/public key pair"
        npx dsig keygen \
            --user-name   "$AUTHOR_NAME" \
            --user-email  "$AUTHOR_EMAIL" \
            --pass-phrase "`cat $BASEDIR/$PACKAGE.pw`" \
            --private-key $BASEDIR/$PACKAGE.prv \
            --public-key  $BASEDIR/$PACKAGE.pub
        cp $BASEDIR/$PACKAGE.pub dsig.pk
        ;;

    #   sign all artifacts with digital signatures
    sign )
        BASEDIR=$HOME/.dsig
        PACKAGE=`npx json -f package.json name`
        VERSION=`npx json -f package.json version`
        HOMEPAGE=`npx json -f package.json homepage`
        for zip in *.zip; do
            echo "++ signing artifact \"$zip\""
            (   echo "Product:  $PACKAGE"
                echo "Homepage: $HOMEPAGE"
                echo "Artifact: $zip"
                echo "Version:  $VERSION"
            ) >.dsig.tmp
            sig=`echo $zip | sed -e 's;\.zip$;.sig;'`
            npx dsig sign \
                --payload     $zip \
                --private-key $BASEDIR/$PACKAGE.prv \
                --pass-phrase "`cat $BASEDIR/$PACKAGE.pw`" \
                --meta-info   .dsig.tmp \
                --signature   $sig
            npx dsig verify \
                --payload     $zip \
                --signature   $sig \
                --public-key  dsig.pk
            rm -f .dsig.tmp
        done
        ;;
esac

