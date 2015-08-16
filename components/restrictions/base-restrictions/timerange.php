<?php
/**
 * Restrict form to a timerange
 *
 * Motherclass for all Restrictions
 *
 * @author awesome.ug, Author <support@awesome.ug>
 * @package Questions/Restrictions
 * @version 1.0.0
 * @since 1.0.0
 * @license GPL 2

Copyright 2015 awesome.ug (support@awesome.ug)

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License, version 2, as
published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

 */

if ( !defined( 'ABSPATH' ) ) exit;

class Questions_Restriction_Timerange extends Questions_Restriction{

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->title = __( 'Timerange', 'wcsc-locale' );
        $this->slug = 'timerange';

        add_action( 'add_meta_boxes', array( $this, 'meta_boxes' ), 10 );
        add_action( 'questions_save_form', array( $this, 'save' ), 10, 1 );

        add_action( 'admin_enqueue_scripts', array( $this , 'enqueue_scripts' ), 15 );
        add_action( 'admin_print_styles', array( $this, 'register_admin_styles' ) );

        add_action( 'questions_additional_restrictions_check', array( $this, 'check' ) );
    }

    /**
     * Adding meta boxes
     *
     * @param string $post_type Actual post type
     * @since 1.0.0
     */
    public function meta_boxes( $post_type )
    {
        add_meta_box(
            'form-timerange',
            esc_attr__('Timerange', 'questions-locale'),
            array( $this, 'meta_box_timerange'),
            'questions',
            'side',
            'high'
        );
    }

    /**
     * Timerange meta box
     */
    public static function meta_box_timerange(){
        global $post;

        $form_id = $post->ID;

        $start_date = get_post_meta( $form_id, 'start_date', TRUE );
        $end_date = get_post_meta( $form_id, 'end_date', TRUE );

        $html = '<label for="start_date">' . esc_attr__( 'When does the survey start?', 'questions-locale' ) . '</label>';
        $html.= '<p><input type="text" id="start_date" name="start_date" value="' . $start_date . '"/></p>';
        $html.= '<label for="end_date">' . esc_attr__( 'When does the survey end?', 'questions-locale' ) . '</label>';
        $html.= '<p><input type="text" id="end_date" name="end_date" value="' . $end_date . '"/></p>';

        echo $html;
    }

    /**
     * Checks if the user can pass
     */
    public function check()
    {
        global $questions_form_id;

        $actual_date = time();
        $start_date = strtotime( get_post_meta( $questions_form_id, 'start_date', TRUE ) );
        $end_date = strtotime( get_post_meta( $questions_form_id, 'end_date', TRUE ) );

        if( '' != $start_date  && 0 != (int)$start_date && FALSE != $start_date && $actual_date < $start_date ){
            $this->add_message( 'error', esc_attr( 'The survey has not yet begun.', 'questions-locale' ) );
            echo $this->messages();
            return FALSE;
        }

        if( '' != $end_date  && 0 != (int)$end_date && FALSE != $end_date && '' != $end_date && $actual_date > $end_date ){
            $this->add_message( 'error', esc_attr( 'The survey is already over.', 'questions-locale' ) );
            echo $this->messages();
            return FALSE;
        }

        return TRUE;
    }

    /**
     * Has IP already participated
     *
     * @param $questions_id
     * @return bool $has_participated
     * @since 1.0.0
     *
     */
    public function ip_has_participated()
    {

        global $wpdb, $questions_global, $quesions_form_id;

        $remote_ip = $_SERVER[ 'REMOTE_ADDR' ];

        $sql   = $wpdb->prepare( "SELECT COUNT(*) FROM {$questions_global->tables->responds} WHERE questions_id=%d AND remote_addr=%s", $quesions_form_id, $remote_ip );
        $count = $wpdb->get_var( $sql );

        if ( 0 == $count ){
            return FALSE;
        }

        return TRUE;
    }

    /**
     * Saving data
     *
     * @param int $form_id
     * @since 1.0.0
     */
    public static function save( $form_id )
    {
        global $wpdb, $questions_global;


        $start_date = $_POST[ 'start_date' ];
        $end_date = $_POST[ 'end_date' ];

        /**
         * Saving start and end date
         */
        update_post_meta( $form_id, 'start_date', $start_date );
        update_post_meta( $form_id, 'end_date', $end_date );
    }

    /**
     * Enqueue admin scripts
     *
     * @since 1.0.0
     */
    public function enqueue_scripts()
    {
        $translation_admin = array(
            'dateformat'                          => esc_attr__( 'yy/mm/dd', 'questions-locale' ),
            'min_sun'                             => esc_attr__( 'Su', 'questions-locale' ),
            'min_mon'                             => esc_attr__( 'Mo', 'questions-locale' ),
            'min_tue'                             => esc_attr__( 'Tu', 'questions-locale' ),
            'min_wed'                             => esc_attr__( 'We', 'questions-locale' ),
            'min_thu'                             => esc_attr__( 'Th', 'questions-locale' ),
            'min_fri'                             => esc_attr__( 'Fr', 'questions-locale' ),
            'min_sat'                             => esc_attr__( 'Sa', 'questions-locale' ),
            'january'                             => esc_attr__( 'January', 'questions-locale' ),
            'february'                            => esc_attr__( 'February', 'questions-locale' ),
            'march'                               => esc_attr__( 'March', 'questions-locale' ),
            'april'                               => esc_attr__( 'April', 'questions-locale' ),
            'may'                                 => esc_attr__( 'May', 'questions-locale' ),
            'june'                                => esc_attr__( 'June', 'questions-locale' ),
            'july'                                => esc_attr__( 'July', 'questions-locale' ),
            'august'                              => esc_attr__( 'August', 'questions-locale' ),
            'september'                           => esc_attr__( 'September', 'questions-locale' ),
            'october'                             => esc_attr__( 'October', 'questions-locale' ),
            'november'                            => esc_attr__( 'November', 'questions-locale' ),
            'december'                            => esc_attr__( 'December', 'questions-locale' ),
        );

        wp_enqueue_script( 'jquery-ui-datepicker' );

        wp_enqueue_script( 'questions-datepicker', QUESTIONS_URLPATH . '/components/restrictions/base-restrictions/includes/js/datepicker.js' );
        wp_localize_script( 'questions-datepicker', 'translation_admin', $translation_admin );
    }

    /**
     * Registers and enqueues admin-specific styles.
     *
     * @since 1.0.0
     */
    public static function register_admin_styles()
    {
        wp_enqueue_style( 'questions-timerange-styles', QUESTIONS_URLPATH . '/components/restrictions/base-restrictions/includes/css/datepicker.css' );
    }
}
qu_register_restriction( 'Questions_Restriction_Timerange' );
