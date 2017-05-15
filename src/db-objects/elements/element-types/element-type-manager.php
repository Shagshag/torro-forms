<?php
/**
 * Element type manager class
 *
 * @package TorroForms
 * @since 1.0.0
 */

namespace awsmug\Torro_Forms\DB_Objects\Elements\Element_Types;

use Leaves_And_Love\Plugin_Lib\Service;
use Leaves_And_Love\Plugin_Lib\Traits\Container_Service_Trait;
use Leaves_And_Love\Plugin_Lib\Traits\Hook_Service_Trait;
use awsmug\Torro_Forms\DB_Objects\Elements\Element_Manager;
use awsmug\Torro_Forms\Error;
use awsmug\Torro_Forms\Assets;
use Leaves_And_Love\Plugin_Lib\Error_Handler;

/**
 * Manager class for element types.
 *
 * @since 1.0.0
 *
 * @method Element_Manager elements()
 * @method Assets          assets()
 * @method Error_Handler   error_handler()
 */
class Element_Type_Manager extends Service {
	use Container_Service_Trait, Hook_Service_Trait;

	/**
	 * Registered element types.
	 *
	 * @since 1.0.0
	 * @access protected
	 * @var array
	 */
	protected $element_types = array();

	/**
	 * Default element types definition.
	 *
	 * @since 1.0.0
	 * @access protected
	 * @var array
	 */
	protected $default_element_types = array();

	/**
	 * The element manager service definition.
	 *
	 * @since 1.0.0
	 * @access protected
	 * @static
	 * @var string
	 */
	protected static $service_elements = Element_Manager::class;

	/**
	 * The Assets API service definition.
	 *
	 * @since 1.0.0
	 * @access protected
	 * @static
	 * @var string
	 */
	protected static $service_assets = Assets::class;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param string $prefix   The instance prefix.
	 * @param array  $services {
	 *     Array of service instances.
	 *
	 *     @type Element_Manager $elements      The element manager instance.
	 *     @type Assets          $assets        The assets instance.
	 *     @type Error_Handler   $error_handler The error handler instance.
	 * }
	 */
	public function __construct( $prefix, $services ) {
		$this->set_prefix( $prefix );
		$this->set_services( $services );
		$this->setup_hooks();

		$this->default_element_types = array(
			'textfield' => Base\Text::class,
		);
	}

	/**
	 * Returns a specific registered element type.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param string $slug Element type slug.
	 * @return Element_Type|Error Element type instance, or error object if element type is not registered.
	 */
	public function get( $slug ) {
		if ( ! isset( $this->element_types[ $slug ] ) ) {
			return new Error( $this->get_prefix() . 'element_type_not_exist', sprintf( __( 'An element type with the slug %s does not exist.', 'torro-forms' ), $slug ), __METHOD__, '1.0.0' );
		}

		return $this->element_types[ $slug ];
	}

	/**
	 * Returns all registered element types.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Associative array of `$slug => $element_type_instance` pairs.
	 */
	public function get_all() {
		return $this->element_types;
	}

	/**
	 * Registers a new element type.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param string $slug                    Element type slug.
	 * @param string $element_type_class_name Element type class name.
	 * @return bool|Error True on success, error object on failure.
	 */
	public function register( $slug, $element_type_class_name ) {
		if ( ! did_action( 'init' ) ) {
			/* translators: 1: element type slug, 2: init hookname */
			return new Error( $this->get_prefix() . 'element_type_too_early', sprintf( __( 'The element type %1$s cannot be registered before the %2$s hook.', 'torro-forms' ), $slug, '<code>init</code>' ), __METHOD__, '1.0.0' );
		}

		if ( isset( $this->element_types[ $slug ] ) ) {
			/* translators: %s: element type slug */
			return new Error( $this->get_prefix() . 'element_type_already_exist', sprintf( __( 'An element type with the slug %s already exists.', 'torro-forms' ), $slug ), __METHOD__, '1.0.0' );
		}

		if ( ! class_exists( $element_type_class_name ) ) {
			/* translators: %s: element type class name */
			return new Error( $this->get_prefix() . 'element_type_class_not_exist', sprintf( __( 'The class %s does not exist.', 'torro-forms' ), $element_type_class_name ), __METHOD__, '1.0.0' );
		}

		if ( ! is_subclass_of( $element_type_class_name, Element_Type::class ) ) {
			/* translators: %s: element type class name */
			return new Error( $this->get_prefix() . 'element_type_class_not_allowed', sprintf( __( 'The class %s is not allowed for a element type.', 'torro-forms' ), $element_type_class_name ), __METHOD__, '1.0.0' );
		}

		$this->element_types[ $slug ] = new $element_type_class_name( $this );

		return true;
	}

	/**
	 * Unregisters a new element type.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param string $slug Element type slug.
	 * @return bool|Error True on success, error object on failure.
	 */
	public function unregister( $slug ) {
		if ( ! isset( $this->element_types[ $slug ] ) ) {
			/* translators: %s: element type slug */
			return new Error( $this->get_prefix() . 'element_type_not_exist', sprintf( __( 'An element type with the slug %s does not exist.', 'torro-forms' ), $slug ), __METHOD__, '1.0.0' );
		}

		if ( isset( $this->default_element_types[ $slug ] ) ) {
			/* translators: %s: element type slug */
			return new Error( $this->get_prefix() . 'element_type_is_default', sprintf( __( 'The default element type %s cannot be unregistered.', 'torro-forms' ), $slug ), __METHOD__, '1.0.0' );
		}

		unset( $this->element_types[ $slug ] );

		return true;
	}

	/**
	 * Registers the default element types.
	 *
	 * The function also executes a hook that should be used by other developers to register their own element types.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function register_defaults() {
		foreach ( $this->default_element_types as $slug => $element_type_class_name ) {
			$this->register( $slug, $element_type_class_name );
		}

		/**
		 * Fires when the default element types have been registered.
		 *
		 * This action should be used to register custom element types.
		 *
		 * @since 1.0.0
		 *
		 * @param Element_Type_Manager $element_types Element type manager instance.
		 */
		do_action( "{$this->get_prefix()}register_element_types", $this );
	}

	/**
	 * Sets up all action and filter hooks for the service.
	 *
	 * This method must be implemented and then be called from the constructor.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function setup_hooks() {
		$this->actions = array(
			array(
				'name'     => 'init',
				'callback' => array( $this, 'register_defaults' ),
				'priority' => 1,
				'num_args' => 0,
			),
		);
	}
}
