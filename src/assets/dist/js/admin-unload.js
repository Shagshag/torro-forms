/*!
 * Torro Forms Version 1.0.4 (https://torro-forms.com)
 * Licensed under GNU General Public License v2 (or later) (http://www.gnu.org/licenses/gpl-2.0.html)
 */
( function( $, postL10n ) {
	'use strict';

	var isDirty = false;

	function makeDirty() {
		isDirty = true;
	}

	$( '#torro-form-canvas' ).one( 'change', 'input', makeDirty );
	$( '#torro-form-canvas' ).one( 'change', 'select', makeDirty );
	$( '#torro-form-canvas' ).one( 'change', 'textarea', makeDirty );
	$( '#torro-form-canvas' ).one( 'click', 'button', makeDirty );

	$( '#postbox-container-2 .postbox input' ).one( 'change', makeDirty );
	$( '#postbox-container-2 .postbox select' ).one( 'change', makeDirty );
	$( '#postbox-container-2 .postbox textarea' ).one( 'change', makeDirty );
	$( '#postbox-container-2 .postbox button' ).one( 'click', makeDirty );

	$( window ).on( 'beforeunload.edit-post', function() {
		if ( isDirty ) {
			return postL10n.saveAlert;
		}
	});

})( window.jQuery, window.postL10n );
