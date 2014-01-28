<?php

if ( !defined( 'ABSPATH' ) ) exit;

/*
* Getting Plugin Template
* @since 1.0.0
*/
if( defined( 'SURVEYVAL_FOLDER') ):
	function sv_locate_template( $template_names, $load = FALSE, $require_once = TRUE ) {
	    $located = '';
		
	    $located = locate_template( $template_names, $load, $require_once );
	
	    if ( '' == $located ):
			foreach ( ( array ) $template_names as $template_name ):
			    if ( !$template_name )
					continue;
			    if ( file_exists( SURVEYVAL_FOLDER . '/templates/' . $template_name ) ):
					$located = SURVEYVAL_FOLDER . '/templates/' . $template_name;
					break;
				endif;
			endforeach;
		endif;
	
	    if ( $load && '' != $located )
		    load_template( $located, $require_once );
	
	    return $located;
	}
endif;

function sv_add_post_rows( $actions, $post ){
	$actions['view_poll_results'] = '<a href="#test">Umfrageergebnisse exportieren</a>';
	return $actions;
}
add_filter( 'post_row_actions', 'sv_add_post_rows', 10, 2 );