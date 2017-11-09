/*!
 * Torro Forms Version 1.0.0-beta.8 (http://torro-forms.com)
 * Licensed under GNU General Public License v3 (http://www.gnu.org/licenses/gpl-3.0.html)
 */
window.torro = window.torro || {};

( function( torro, $, _, i18n ) {
	'use strict';

	var instanceCount = 0,
		initialized = [],
		callbacks = {},
		builder;

	/**
	 * A form builder instance.
	 *
	 * @class
	 *
	 * @param {string} selector DOM selector for the wrapping element for the UI.
	 */
	function Builder( selector ) {
		instanceCount++;
		callbacks[ 'builder' + instanceCount ] = [];

		this.instanceNumber = instanceCount;

		this.$el = $( selector );
	}

	_.extend( Builder.prototype, {

		/**
		 * Available element types.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {torro.Builder.ElementTypes}
		 */
		elementTypes: undefined,

		/**
		 * Current form model.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {torro.Builder.FormModel}
		 */
		form: undefined,

		/**
		 * Form view object.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {torro.Builder.FormView}
		 */
		formView: undefined,

		/**
		 * Initializes the form builder.
		 *
		 * @since 1.0.0
		 * @access public
		 */
		init: function() {
			if ( ! this.$el.length ) {
				console.error( i18n.couldNotInitCanvas );
				return;
			}

			torro.api.init()
				.done( _.bind( function() {
					( new torro.api.collections.ElementTypes() ).fetch({
						data: {
							context: 'edit'
						},
						context: this,
						success: function( elementTypes ) {
							this.elementTypes = torro.Builder.ElementTypes.fromApiCollection( elementTypes );

							if ( 'auto-draft' !== $( '#original_post_status' ).val() ) {
								( new torro.api.models.Form({
									id: parseInt( $( '#post_ID' ).val(), 10 )
								}) ).fetch({
									data: {
										context: 'edit',
										_embed: true
									},
									context: this,
									success: function( form ) {
										$( document ).ready( _.bind( function() {
											var i;

											initialized.push( this.instanceCount );

											this.setupInitialData( form.attributes );
											this.setupViews();

											for ( i in callbacks[ 'builder' + this.instanceCount ] ) {
												callbacks[ 'builder' + this.instanceCount ][ i ]( this );
											}

											delete callbacks[ 'builder' + this.instanceCount ];
										}, this ) );
									},
									error: function() {
										$( document ).ready( _.bind( function() {
											this.fail( i18n.couldNotLoadData );
										}, this ) );
									}
								});
							} else {
								$( document ).ready( _.bind( function() {
									var i;

									initialized.push( this.instanceCount );

									this.setupInitialData();
									this.setupViews();

									for ( i in callbacks[ 'builder' + this.instanceCount ] ) {
										callbacks[ 'builder' + this.instanceCount ][ i ]( this );
									}

									delete callbacks[ 'builder' + this.instanceCount ];
								}, this ) );
							}
						},
						error: function() {
							$( document ).ready( _.bind( function() {
								this.fail( i18n.couldNotLoadData );
							}, this ) );
						}
					});
				}, this ) )
				.fail( _.bind( function() {
					$( document ).ready( _.bind( function() {
						this.fail( i18n.couldNotLoadData );
					}, this ) );
				}, this ) );
		},

		/**
		 * Sets up initial data for the form builder.
		 *
		 * This method only works if the form builder has been initialized.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object|undefined} form REST API form response including embedded data, or
		 *                                undefined if this is a new form.
		 */
		setupInitialData: function( form ) {
			var container, element, elementChoice, elementSetting, elementParents, i;

			if ( ! _.contains( initialized, this.instanceCount ) ) {
				return;
			}

			if ( form ) {
				this.form = new torro.Builder.FormModel( form, {
					container_label_placeholder: i18n.defaultContainerLabel
				});

				if ( form._embedded.containers && form._embedded.containers[0] ) {
					this.form.containers.add( form._embedded.containers[0] );

					if ( form._embedded.elements && form._embedded.elements[0] ) {
						elementParents = {};

						for ( i = 0; i < form._embedded.elements[0].length; i++ ) {
							element = form._embedded.elements[0][ i ];

							container = this.form.containers.get( element.container_id );
							if ( container ) {
								container.elements.add( element );

								elementParents[ element.id ] = element.container_id;
							}
						}

						if ( form._embedded.element_choices && form._embedded.element_choices[0] ) {
							for ( i = 0; i < form._embedded.element_choices[0].length; i++ ) {
								elementChoice = form._embedded.element_choices[0][ i ];

								if ( elementParents[ elementChoice.element_id ] ) {
									container = this.form.containers.get( elementParents[ elementChoice.element_id ] );
									if ( container ) {
										element = container.elements.get( elementChoice.element_id );
										if ( element ) {
											element.element_choices.add( elementChoice );
										}
									}
								}
							}
						}

						if ( form._embedded.element_settings && form._embedded.element_settings[0] ) {
							for ( i = 0; i < form._embedded.element_settings[0].length; i++ ) {
								elementSetting = form._embedded.element_settings[0][ i ];

								if ( elementParents[ elementSetting.element_id ] ) {
									container = this.form.containers.get( elementParents[ elementSetting.element_id ] );
									if ( container ) {
										element = container.elements.get( elementSetting.element_id );
										if ( element ) {
											element.setElementSetting( elementSetting );
										}
									}
								}
							}
						}
					}
				}
			} else {
				this.form = new torro.Builder.FormModel({}, {
					container_label_placeholder: i18n.defaultContainerLabel
				});

				this.form.containers.add({});
			}
		},

		/**
		 * Sets up form builder views.
		 *
		 * This method only works if the form builder has been initialized.
		 *
		 * @since 1.0.0
		 * @access public
		 */
		setupViews: function() {
			if ( ! _.contains( initialized, this.instanceCount ) ) {
				return;
			}

			this.formView = new torro.Builder.FormView( this.$el, this.form, {
				i18n: i18n
			});

			this.formView.render();
		},

		/**
		 * Adds a callback that will be executed once the form builder has been initialized.
		 *
		 * If the form builder has already been initialized, the callback will be executed
		 * immediately.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {function} callback Callback to execute. Should accept the form builder instance
		 *                            as parameter.
		 */
		onLoad: function( callback ) {
			if ( _.isUndefined( callbacks[ 'builder' + this.instanceCount ] ) ) {
				callback( this );
				return;
			}

			callbacks[ 'builder' + this.instanceCount ].push( callback );
		},

		/**
		 * Shows a failure message for the form builder in the UI.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {string} message Failure message to display.
		 */
		fail: function( message ) {
			var compiled = torro.template( 'failure' );

			this.$el.find( '.drag-drop-area' ).addClass( 'is-empty' ).html( compiled({ message: message }) );
		}
	});

	torro.Builder = Builder;

	/**
	 * Returns the main form builder instance.
	 *
	 * It will be instantiated and initialized if it does not exist yet.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	torro.Builder.getInstance = function() {
		if ( ! builder ) {
			builder = new Builder( '#torro-form-canvas' );
			builder.init();
		}

		return builder;
	};

	torro.getFieldName = function( model, attribute ) {
		var groupSlug;

		if ( model instanceof torro.Builder.FormModel ) {
			groupSlug = 'forms';
		} else if ( model instanceof torro.Builder.ContainerModel ) {
			groupSlug = 'containers';
		} else if ( model instanceof torro.Builder.ElementModel ) {
			groupSlug = 'elements';
		} else if ( model instanceof torro.Builder.ElementChoiceModel ) {
			groupSlug = 'element_choices';
		} else if ( model instanceof torro.Builder.ElementSettingModel ) {
			groupSlug = 'element_settings';
		}

		if ( ! groupSlug ) {
			return;
		}

		return 'torro_' + groupSlug + '[' + model.get( 'id' ) + '][' + attribute + ']';
	};

	torro.getDeletedFieldName = function( model ) {
		var groupSlug;

		if ( model instanceof torro.Builder.FormModel ) {
			groupSlug = 'forms';
		} else if ( model instanceof torro.Builder.ContainerModel ) {
			groupSlug = 'containers';
		} else if ( model instanceof torro.Builder.ElementModel ) {
			groupSlug = 'elements';
		} else if ( model instanceof torro.Builder.ElementChoiceModel ) {
			groupSlug = 'element_choices';
		} else if ( model instanceof torro.Builder.ElementSettingModel ) {
			groupSlug = 'element_settings';
		}

		if ( ! groupSlug ) {
			return;
		}

		return 'torro_deleted_' + groupSlug + '[]';
	};

	torro.askConfirmation = function( message, successCallback ) {
		var $dialog = $( '<div />' );

		$dialog.html( message );

		$( 'body' ).append( $dialog );

		$dialog.dialog({
			dialogClass: 'wp-dialog torro-dialog',
			modal: true,
			autoOpen: true,
			closeOnEscape: true,
			minHeight: 80,
			buttons: [
				{
					text: i18n.yes,
					click: function() {
						successCallback();

						$( this ).dialog( 'close' );
						$( this ).remove();
					}
				},
				{
					text: i18n.no,
					click: function() {
						$( this ).dialog( 'close' );
						$( this ).remove();
					}
				}
			]
		});
	};

}( window.torro, window.jQuery, window._, window.torroBuilderI18n ) );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * An element type.
	 *
	 * @class
	 *
	 * @param {object} attributes Element type attributes.
	 */
	function ElementType( attributes ) {
		this.attributes = attributes;
	}

	_.extend( ElementType.prototype, {

		/**
		 * Returns the element type slug.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} Element type slug.
		 */
		getSlug: function() {
			return this.attributes.slug;
		},

		/**
		 * Returns the element type title.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} Element type title.
		 */
		getTitle: function() {
			return this.attributes.title;
		},

		/**
		 * Returns the element type description.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} Element type description.
		 */
		getDescription: function() {
			return this.attributes.description;
		},

		/**
		 * Returns the element type icon URL.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} Element type icon URL.
		 */
		getIconUrl: function() {
			return this.attributes.icon_url;
		},

		/**
		 * Checks whether the element type is a non input element type.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} True if the element type is a non input element type, false otherwise.
		 */
		isNonInput: function() {
			return this.attributes.non_input;
		},

		/**
		 * Checks whether the element type is evaluable.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} True if the element type is evaluable, false otherwise.
		 */
		isEvaluable: function() {
			return this.attributes.evaluable;
		},

		/**
		 * Checks whether the element type contains multiple fields.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {string} True if the element type contains multiple fields, false otherwise.
		 */
		isMultiField: function() {
			return this.attributes.multifield;
		},

		/**
		 * Returns the settings sections that belong to the element type.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object[]} Element type sections.
		 */
		getSections: function() {
			return this.attributes.sections;
		},

		/**
		 * Returns the settings fields that belong to the element type.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object[]} Element type fields.
		 */
		getFields: function() {
			return this.attributes.fields;
		}
	});

	torroBuilder.ElementType = ElementType;

})( window.torro.Builder, window._ );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A list of available element types.
	 *
	 * @class
	 *
	 * @param {torro.Builder.ElementType[]} elementTypes Registered element type objects.
	 */
	function ElementTypes( elementTypes ) {
		var i;

		this.types = {};

		for ( i in elementTypes ) {
			this.types[ elementTypes[ i ].getSlug() ] = elementTypes[ i ];
		}
	}

	_.extend( ElementTypes.prototype, {

		/**
		 * Returns a specific element type.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {torro.Builder.ElementType|undefined} Element type object, or undefined if not available.
		 */
		get: function( slug ) {
			if ( _.isUndefined( this.types[ slug ] ) ) {
				return undefined;
			}

			return this.types[ slug ];
		},

		/**
		 * Returns all element types.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {torro.Builder.ElementType[]} All element type objects.
		 */
		getAll: function() {
			return this.types;
		}
	});

	/**
	 * Generates an element types list instance from a REST API response.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @returns {torro.Builder.ElementTypes} Element types object.
	 */
	ElementTypes.fromApiCollection = function( collection ) {
		var elementTypes = [];

		collection.each( function( model ) {
			var attributes = _.extend({}, model.attributes );
			if ( attributes._links ) {
				delete attributes._links;
			}
			if ( attributes._embedded ) {
				delete attributes._embedded;
			}

			elementTypes.push( new torroBuilder.ElementType( attributes ) );
		});

		return new ElementTypes( elementTypes );
	};

	torroBuilder.ElementTypes = ElementTypes;

})( window.torro.Builder, window._ );

( function( torroBuilder, torro, _, Backbone ) {
	'use strict';

	/**
	 * Base for a form builder model.
	 *
	 * This model has no persistence with the server.
	 *
	 * @class
	 * @augments Backbone.Model
	 */
	torroBuilder.BaseModel = Backbone.Model.extend({

		/**
		 * Related REST links.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {object}
		 */
		links: {},

		/**
		 * Instantiates a new model.
		 *
		 * Overrides constructor in order to strip out unnecessary attributes.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object} [attributes] Model attributes.
		 * @param {object} [options]    Options for the model behavior.
		 */
		constructor: function( attributes, options ) {
			var attrs = attributes || {};
			var idAttribute = this.idAttribute || Backbone.Model.prototype.idAttribute || 'id';

			if ( attrs._links ) {
				this.links = attrs._links;
			}

			attrs = _.omit( attrs, [ '_links', '_embedded' ] );

			if ( ! attrs[ idAttribute ] ) {
				attrs[ idAttribute ] = torro.generateTempId();
			}

			Backbone.Model.apply( this, [ attrs, options ] );
		},

		/**
		 * Synchronizes the model with the server.
		 *
		 * Overrides synchronization in order to disable synchronization.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {boolean} True on success, false on failure.
		 */
		sync: function( method, model, options ) {
			if ( 'create' === method && model.has( model.idAttribute ) ) {
				if ( ! options.attrs ) {
					options.attrs = model.toJSON( options );
				}

				options.attrs = _.omit( options.attrs, model.idAttribute );
			}

			return false;
		},

		/**
		 * Checks whether this model is new.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @return {boolean} True if the model is new, false otherwise.
		 */
		isNew: function() {
			return ! this.has( this.idAttribute ) || torro.isTempId( this.get( this.idAttribute ) );
		}
	});

})( window.torro.Builder, window.torro, window._, window.Backbone );

( function( torroBuilder, torro, _, Backbone ) {
	'use strict';

	/**
	 * Base for a form builder collection.
	 *
	 * This collection has no persistence with the server.
	 *
	 * @class
	 * @augments Backbone.Collection
	 */
	torroBuilder.BaseCollection = Backbone.Collection.extend({

		/**
		 * Model class for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.BaseModel,

		/**
		 * Default properties for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaultProps: {},

		/**
		 * Instantiates a new collection.
		 *
		 * Sets up collection properties.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object[]} [models]  Models for the collection.
		 * @param {object}   [options] Options for the model behavior.
		 */
		constructor: function( models, options ) {
			var props = _.defaults( options && options.props || {}, this.defaultProps );

			this.props = new Backbone.Model( props );

			if ( this.urlEndpoint ) {
				this.url = torro.api.root + torro.api.versionString + this.urlEndpoint;
			}

			Backbone.Collection.apply( this, arguments );
		},

		/**
		 * Synchronizes the collection with the server.
		 *
		 * Overrides synchronization in order to disable synchronization.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {boolean} True on success, false on failure.
		 */
		sync: function() {
			return false;
		}
	});

})( window.torro.Builder, window.torro, window._, window.Backbone );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A single container.
	 *
	 * @class
	 * @augments torro.Builder.BaseModel
	 */
	torroBuilder.ContainerModel = torroBuilder.BaseModel.extend({

		/**
		 * Returns container defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Container defaults.
		 */
		defaults: function() {
			return _.extend( _.clone({
				id: 0,
				form_id: 0,
				label: '',
				sort: 0
			}), this.collection.getDefaultAttributes() );
		},

		/**
		 * Element collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		elements: undefined,

		/**
		 * Instantiates a new model.
		 *
		 * Overrides constructor in order to strip out unnecessary attributes.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object} [attributes] Model attributes.
		 * @param {object} [options]    Options for the model behavior.
		 */
		constructor: function( attributes, options ) {
			attributes = attributes || {};

			if ( _.isUndefined( attributes.addingElement ) ) {
				options = options || {};

				if ( options.addingElement ) {
					attributes.addingElement = true;
				} else {
					attributes.addingElement = false;
				}
			}

			if ( _.isUndefined( attributes.selectedElementType ) ) {
				options = options || {};

				if ( options.selectedElementType ) {
					attributes.selectedElementType = options.selectedElementType;
				} else {
					attributes.selectedElementType = false;
				}
			}

			torroBuilder.BaseModel.apply( this, [ attributes, options ] );

			this.elements = new torroBuilder.ElementCollection([], {
				props: {
					container_id: this.get( 'id' )
				}
			});
		}
	});

})( window.torro.Builder, window._ );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A single element choice.
	 *
	 * @class
	 * @augments torro.Builder.BaseModel
	 */
	torroBuilder.ElementChoiceModel = torroBuilder.BaseModel.extend({

		/**
		 * Returns element choice defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element choice defaults.
		 */
		defaults: function() {
			return _.extend( _.clone({
				id: 0,
				element_id: 0,
				field: '',
				value: '',
				sort: 0
			}), this.collection.getDefaultAttributes() );
		}
	});

})( window.torro.Builder, window._ );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A single element.
	 *
	 * @class
	 * @augments torro.Builder.BaseModel
	 */
	torroBuilder.ElementModel = torroBuilder.BaseModel.extend({

		/**
		 * Returns element defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element defaults.
		 */
		defaults: function() {
			return _.extend( _.clone({
				id: 0,
				container_id: 0,
				label: '',
				sort: 0,
				type: 'textfield'
			}), this.collection.getDefaultAttributes() );
		},

		/**
		 * Element type object.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		element_type: null,

		/**
		 * Element choice collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		element_choices: null,

		/**
		 * Element setting collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		element_settings: undefined,

		/**
		 * Identifier of the currently active section.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {string}
		 */
		active_section: undefined,

		/**
		 * Instantiates a new model.
		 *
		 * Overrides constructor in order to strip out unnecessary attributes.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object} [attributes] Model attributes.
		 * @param {object} [options]    Options for the model behavior.
		 */
		constructor: function( attributes, options ) {
			torroBuilder.BaseModel.apply( this, [ attributes, options ] );

			this.element_choices = new torroBuilder.ElementChoiceCollection([], {
				props: {
					element_id: this.get( 'id' )
				}
			});

			this.element_settings = new torroBuilder.ElementSettingCollection([], {
				props: {
					element_id: this.get( 'id' )
				}
			});

			this.listenTypeChanged( this, this.get( 'type' ) );

			this.on( 'change:type', this.listenTypeChanged, this );
		},

		setElementSetting: function( elementSetting ) {
			var existingSetting, index;

			if ( elementSetting.attributes ) {
				elementSetting = elementSetting.attributes;
			}

			existingSetting = this.element_settings.findWhere({
				name: elementSetting.name
			});
			if ( ! existingSetting ) {
				return false;
			}

			index = this.element_settings.indexOf( existingSetting );

			this.element_settings.remove( existingSetting );
			this.element_settings.add( elementSetting, {
				at: index
			});

			return true;
		},

		setActiveSection: function( section ) {
			if ( section === this.active_section ) {
				return;
			}

			this.active_section = section;

			this.trigger( 'changeActiveSection', this, this.active_section );
		},

		getActiveSection: function() {
			return this.active_section;
		},

		listenTypeChanged: function( element, type ) {
			var sections, settingFields, settingNames, oldSettings = {};

			element.element_type = torroBuilder.getInstance().elementTypes.get( type );
			if ( ! element.element_type ) {
				return;
			}

			this.trigger( 'changeElementType', element, element.element_type );

			sections = element.element_type.getSections();
			if ( sections.length ) {
				element.setActiveSection( sections[0].slug );
			}

			settingFields = element.element_type.getFields().filter( function( field ) {
				return ! field.is_label && ! field.is_choices;
			});

			settingNames = settingFields.map( function( settingField ) {
				return settingField.slug;
			});

			element.element_settings.each( function( elementSetting ) {
				if ( settingNames.includes( elementSetting.name ) ) {
					oldSettings[ elementSetting.name ] = elementSetting.attributes;
				}
			});
			element.element_settings.reset();

			_.each( settingFields, function( settingField ) {
				if ( oldSettings[ settingField.slug ] ) {
					element.element_settings.add( oldSettings[ settingField.slug ] );
				} else {
					element.element_settings.create({
						name: settingField.slug,
						value: settingField['default'] || null
					});
				}
			});
		}
	});

})( window.torro.Builder, window._ );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A single element setting.
	 *
	 * @class
	 * @augments torro.Builder.BaseModel
	 */
	torroBuilder.ElementSettingModel = torroBuilder.BaseModel.extend({

		/**
		 * Returns element choice defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element choice defaults.
		 */
		defaults: function() {
			return _.extend( _.clone({
				id: 0,
				element_id: 0,
				name: '',
				value: ''
			}), this.collection.getDefaultAttributes() );
		}
	});

})( window.torro.Builder, window._ );

( function( torroBuilder ) {
	'use strict';

	/**
	 * A single form.
	 *
	 * @class
	 * @augments torro.Builder.BaseModel
	 */
	torroBuilder.FormModel = torroBuilder.BaseModel.extend({

		/**
		 * Form defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaults: {
			id: 0,
			title: '',
			slug: '',
			author: 0,
			status: 'draft',
			timestamp: 0,
			timestamp_modified: 0
		},

		/**
		 * Container collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		containers: undefined,

		/**
		 * Instantiates a new model.
		 *
		 * Overrides constructor in order to strip out unnecessary attributes.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @param {object} [attributes] Model attributes.
		 * @param {object} [options]    Options for the model behavior.
		 */
		constructor: function( attributes, options ) {
			var containerProps;

			torroBuilder.BaseModel.apply( this, [ attributes, options ] );

			containerProps = {
				form_id: this.get( 'id' )
			};

			if ( 'object' === typeof options && options.container_label_placeholder ) {
				containerProps.label_placeholder = options.container_label_placeholder;
			}

			this.containers = new torroBuilder.ContainerCollection([], {
				props: containerProps
			});
		}
	});

})( window.torro.Builder );

( function( torroBuilder, _ ) {
	'use strict';

	/**
	 * A collection of containers.
	 *
	 * @class
	 * @augments torro.Builder.BaseCollection
	 */
	torroBuilder.ContainerCollection = torroBuilder.BaseCollection.extend({

		/**
		 * Model class for the container collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.ContainerModel,

		/**
		 * REST endpoint URL part for accessing containers.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {string}
		 */
		urlEndpoint: 'containers',

		/**
		 * Default properties for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaultProps: {
			selected:          false,
			form_id:           0,
			label_placeholder: 'Page %s'
		},

		/**
		 * Returns container defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Container defaults.
		 */
		getDefaultAttributes: function() {
			var labelNumber = this.length + 1;
			var sort        = this.length;
			var last;

			if ( this.length ) {
				last = this.at( this.length - 1 );

				if ( last ) {
					sort = last.get( 'sort' ) + 1;

					if ( last.get( 'label' ) === this.props.get( 'label_placeholder' ).replace( '%s', sort ) ) {
						labelNumber = sort + 1;
					}
				}
			}

			return {
				form_id: this.props.get( 'form_id' ),
				label:   this.props.get( 'label_placeholder' ).replace( '%s', labelNumber ),
				sort:    sort
			};
		},

		initialize: function() {
			this.on( 'add', _.bind( this.maybeUpdateSelectedOnAdd, this ) );
			this.on( 'remove', _.bind( this.maybeUpdateSelectedOnRemove, this ) );
		},

		maybeUpdateSelectedOnAdd: function( container ) {
			if ( container ) {
				this.props.set( 'selected', container.get( 'id' ) );
			}
		},

		maybeUpdateSelectedOnRemove: function( container, containers, options ) {
			var index = options.index ? options.index - 1 : options.index;

			if ( container && this.props.get( 'selected' ) === container.get( 'id' ) ) {
				if ( this.length ) {
					this.props.set( 'selected', this.at( index ).get( 'id' ) );
				} else {
					this.props.set( 'selected', false );
				}
			}
		}
	});

})( window.torro.Builder, window._ );

( function( torroBuilder ) {
	'use strict';

	/**
	 * A collection of element choices.
	 *
	 * @class
	 * @augments torro.Builder.BaseCollection
	 */
	torroBuilder.ElementChoiceCollection = torroBuilder.BaseCollection.extend({

		/**
		 * Model class for the element choice collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.ElementChoiceModel,

		/**
		 * REST endpoint URL part for accessing element choices.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {string}
		 */
		urlEndpoint: 'element_choices',

		/**
		 * Default properties for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaultProps: {
			element_id: 0
		},

		/**
		 * Returns element choice defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element choice defaults.
		 */
		getDefaultAttributes: function() {
			return {
				element_id: this.props.get( 'element_id' ),
				sort:       this.length
			};
		}
	});

})( window.torro.Builder );

( function( torroBuilder ) {
	'use strict';

	/**
	 * A collection of elements.
	 *
	 * @class
	 * @augments torro.Builder.BaseCollection
	 */
	torroBuilder.ElementCollection = torroBuilder.BaseCollection.extend({

		/**
		 * Model class for the element collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.ElementModel,

		/**
		 * REST endpoint URL part for accessing elements.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {string}
		 */
		urlEndpoint: 'elements',

		/**
		 * Default properties for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaultProps: {
			active:       [],
			container_id: 0
		},

		/**
		 * Returns element defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element defaults.
		 */
		getDefaultAttributes: function() {
			return {
				container_id: this.props.get( 'container_id' ),
				sort:         this.length
			};
		},

		toggleActive: function( id ) {
			var active = this.props.get( 'active' );
			var index = active.indexOf( id );

			if ( index > -1 ) {
				active.splice( index, 1 );
			} else {
				active.push( id );
			}

			this.props.set( 'active', active );

			this.props.trigger( 'toggleActive', this, active, {});
		}
	});

})( window.torro.Builder );

( function( torroBuilder ) {
	'use strict';

	/**
	 * A collection of element settings.
	 *
	 * @class
	 * @augments torro.Builder.BaseCollection
	 */
	torroBuilder.ElementSettingCollection = torroBuilder.BaseCollection.extend({

		/**
		 * Model class for the element setting collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.ElementSettingModel,

		/**
		 * REST endpoint URL part for accessing element settings.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {string}
		 */
		urlEndpoint: 'element_settings',

		/**
		 * Default properties for the collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {object}
		 */
		defaultProps: {
			element_id: 0
		},

		/**
		 * Returns element setting defaults.
		 *
		 * @since 1.0.0
		 * @access public
		 *
		 * @returns {object} Element setting defaults.
		 */
		getDefaultAttributes: function() {
			return {
				element_id: this.props.get( 'element_id' ),
				sort:       this.length
			};
		}
	});

})( window.torro.Builder );

( function( torroBuilder ) {
	'use strict';

	/**
	 * A collection of forms.
	 *
	 * @class
	 * @augments torro.Builder.BaseCollection
	 */
	torroBuilder.FormCollection = torroBuilder.BaseCollection.extend({

		/**
		 * Model class for the form collection.
		 *
		 * @since 1.0.0
		 * @access public
		 * @property {function}
		 */
		model: torroBuilder.FormModel,

		/**
		 * REST endpoint URL part for accessing forms.
		 *
		 * @since 1.0.0
		 * @access public
		 * @type {string}
		 */
		urlEndpoint: 'forms'
	});

})( window.torro.Builder );

( function( torro, $, _ ) {
	'use strict';

	/**
	 * A container view.
	 *
	 * @class
	 *
	 * @param {torro.Builder.Container} container Container model.
	 * @param {object}                  options   View options.
	 */
	function ContainerView( container, options ) {
		var id       = container.get( 'id' );
		var selected = container.get( 'id' ) === container.collection.props.get( 'selected' );

		this.container = container;
		this.options = options || {};

		this.tabTemplate = torro.template( 'container-tab' );
		this.panelTemplate = torro.template( 'container-panel' );
		this.footerPanelTemplate = torro.template( 'container-footer-panel' );

		this.$tab = $( '<button />' );
		this.$tab.attr( 'type', 'button' );
		this.$tab.attr( 'id', 'container-tab-' + id );
		this.$tab.addClass( 'torro-form-canvas-tab' );
		this.$tab.attr( 'aria-controls', 'container-panel-' + id + ' container-footer-panel-' + id );
		this.$tab.attr( 'aria-selected', selected ? 'true' : 'false' );
		this.$tab.attr( 'role', 'tab' );

		this.$panel = $( '<div />' );
		this.$panel.attr( 'id', 'container-panel-' + id );
		this.$panel.addClass( 'torro-form-canvas-panel' );
		this.$panel.attr( 'aria-labelledby', 'container-tab-' + id );
		this.$panel.attr( 'aria-hidden', selected ? 'false' : 'true' );
		this.$panel.attr( 'role', 'tabpanel' );

		this.$footerPanel = $( '<div />' );
		this.$footerPanel.attr( 'id', 'container-footer-panel-' + id );
		this.$footerPanel.addClass( 'torro-form-canvas-panel' );
		this.$footerPanel.attr( 'aria-labelledby', 'container-tab-' + id );
		this.$footerPanel.attr( 'aria-hidden', selected ? 'false' : 'true' );
		this.$footerPanel.attr( 'role', 'tabpanel' );
	}

	_.extend( ContainerView.prototype, {
		render: function() {
			var combinedAttributes, i;

			combinedAttributes = _.clone( this.container.attributes );

			combinedAttributes.elementTypes = [];
			_.each( torro.Builder.getInstance().elementTypes.getAll(), function( elementType ) {
				combinedAttributes.elementTypes.push( elementType.attributes );
			});

			this.$tab.html( this.tabTemplate( this.container.attributes ) );
			this.$panel.html( this.panelTemplate( combinedAttributes ) );
			this.$footerPanel.html( this.footerPanelTemplate( this.container.attributes ) );

			this.checkHasElements();

			for ( i = 0; i < this.container.elements.length; i++ ) {
				this.listenAddElement( this.container.elements.at( i ) );
			}

			this.attach();
		},

		destroy: function() {
			this.detach();

			this.$tab.remove();
			this.$panel.remove();
			this.$footerPanel.remove();
		},

		attach: function() {
			this.container.on( 'remove', this.listenRemove, this );
			this.container.elements.on( 'add', this.listenAddElement, this );
			this.container.elements.on( 'add remove reset', this.checkHasElements, this );
			this.container.on( 'change:label', this.listenChangeLabel, this );
			this.container.on( 'change:sort', this.listenChangeSort, this );
			this.container.on( 'change:addingElement', this.listenChangeAddingElement, this );
			this.container.on( 'change:selectedElementType', this.listenChangeSelectedElementType, this );
			this.container.collection.props.on( 'change:selected', this.listenChangeSelected, this );

			this.$tab.on( 'click', _.bind( this.setSelected, this ) );
			this.$tab.on( 'dblclick', _.bind( this.editLabel, this ) );
			this.$panel.on( 'click', '.add-element-toggle', _.bind( this.toggleAddingElement, this ) );
			this.$panel.on( 'click', '.torro-element-type', _.bind( this.setSelectedElementType, this ) );
			this.$panel.on( 'click', '.add-element-button', _.bind( this.addElement, this ) );
			this.$footerPanel.on( 'click', '.delete-container-button', _.bind( this.deleteContainer, this ) );

			// TODO: add jQuery hooks
		},

		detach: function() {
			this.container.collection.props.off( 'change:selected', this.listenChangeSelected, this );
			this.container.off( 'change:selectedElementType', this.listenChangeSelectedElementType, this );
			this.container.off( 'change:addingElement', this.listenChangeAddingElement, this );
			this.container.off( 'change:sort', this.listenChangeSort, this );
			this.container.off( 'change:label', this.listenChangeLabel, this );
			this.container.elements.off( 'add remove reset', this.checkHasElements, this );
			this.container.elements.off( 'add', this.listenAddContainer, this );
			this.container.off( 'remove', this.listenRemove, this );

			this.$footerPanel.off( 'click', '.delete-container-button', _.bind( this.deleteContainer, this ) );
			this.$panel.off( 'click', '.add-element-button', _.bind( this.addElement, this ) );
			this.$panel.off( 'click', '.torro-element-type', _.bind( this.setSelectedElementType, this ) );
			this.$panel.off( 'click', '.add-element-toggle', _.bind( this.toggleAddingElement, this ) );
			this.$tab.off( 'dblclick', _.bind( this.editLabel, this ) );
			this.$tab.off( 'click', _.bind( this.setSelected, this ) );

			// TODO: remove jQuery hooks
		},

		listenRemove: function() {
			var id = this.container.get( 'id' );

			if ( ! torro.isTempId( id ) ) {
				$( '#torro-deleted-wrap' ).append( '<input type="hidden" name="' + torro.getDeletedFieldName( this.container ) + '" value="' + id + '" />' );
			}

			this.destroy();
		},

		listenAddElement: function( element ) {
			var view = new torro.Builder.ElementView( element, this.options );

			this.$panel.find( '.drag-drop-area' ).append( view.$wrap );

			view.render();
		},

		checkHasElements: function() {
			if ( this.container.elements.length ) {
				this.$panel.find( '.drag-drop-area' ).removeClass( 'is-empty' );
			} else {
				this.$panel.find( '.drag-drop-area' ).addClass( 'is-empty' );
			}
		},

		listenChangeLabel: function( container, label ) {
			var name = torro.escapeSelector( torro.getFieldName( this.container, 'label' ) );

			this.$panel.find( 'input[name="' + name + '"]' ).val( label );
		},

		listenChangeSort: function( container, sort ) {
			var name = torro.escapeSelector( torro.getFieldName( this.container, 'sort' ) );

			this.$panel.find( 'input[name="' + name + '"]' ).val( sort );
		},

		listenChangeAddingElement: function( container, addingElement ) {
			if ( addingElement ) {
				this.$panel.find( '.add-element-toggle-wrap' ).addClass( 'is-expanded' );
				this.$panel.find( '.add-element-toggle' ).attr( 'aria-expanded', 'true' );
				this.$panel.find( '.add-element-content-wrap' ).addClass( 'is-expanded' );
			} else {
				this.$panel.find( '.add-element-toggle-wrap' ).removeClass( 'is-expanded' );
				this.$panel.find( '.add-element-toggle' ).attr( 'aria-expanded', 'false' );
				this.$panel.find( '.add-element-content-wrap' ).removeClass( 'is-expanded' );
			}
		},

		listenChangeSelectedElementType: function( container, selectedElementType ) {
			var elementType;

			this.$panel.find( '.torro-element-type' ).removeClass( 'is-selected' );

			if ( selectedElementType ) {
				elementType = torro.Builder.getInstance().elementTypes.get( selectedElementType );
				if ( elementType ) {
					this.$panel.find( '.torro-element-type-' + elementType.getSlug() ).addClass( 'is-selected' );
					this.$panel.find( '.add-element-button' ).prop( 'disabled', false );
					return;
				}
			}

			this.$panel.find( '.add-element-button' ).prop( 'disabled', true );
		},

		listenChangeSelected: function( props, selected ) {
			if ( selected === this.container.get( 'id' ) ) {
				this.$tab.attr( 'aria-selected', 'true' );
				this.$panel.attr( 'aria-hidden', 'false' );
				this.$footerPanel.attr( 'aria-hidden', 'false' );
			} else {
				this.$tab.attr( 'aria-selected', 'false' );
				this.$panel.attr( 'aria-hidden', 'true' );
				this.$footerPanel.attr( 'aria-hidden', 'true' );
			}
		},

		setSelected: function() {
			this.container.collection.props.set( 'selected', this.container.get( 'id' ) );
		},

		editLabel: function() {
			var container = this.container;
			var $original = this.$tab.find( 'span' );
			var $replacement;

			if ( ! $original.length ) {
				return;
			}

			$replacement = $( '<input />' );
			$replacement.attr( 'type', 'text' );
			$replacement.val( $original.text() );

			$replacement.on( 'keydown blur', function( event ) {
				var proceed = false;
				var value;

				if ( 'keydown' === event.type ) {
					if ( 13 === event.which ) {
						proceed = true;

						event.preventDefault();
					} else if ( [ 32, 37, 38, 39, 40 ].includes( event.which ) ) {
						event.stopPropagation();
					}
				} else if ( 'blur' === event.type ) {
					proceed = true;
				} else {
					event.stopPropagation();
				}

				if ( ! proceed ) {
					return;
				}

				value = $replacement.val();

				container.set( 'label', value );

				$original.text( value );
				$replacement.replaceWith( $original );
				$original.focus();
			});

			$original.replaceWith( $replacement );
			$replacement.focus();
		},

		toggleAddingElement: function() {
			if ( this.container.get( 'addingElement' ) ) {
				this.container.set( 'addingElement', false );
			} else {
				this.container.set( 'addingElement', true );
			}
		},

		setSelectedElementType: function( e ) {
			var slug = false;

			if ( e && e.currentTarget ) {
				slug = $( e.currentTarget ).data( 'slug' );
			}

			if ( slug ) {
				this.container.set( 'selectedElementType', slug );
			} else {
				this.container.set( 'selectedElementType', false );
			}
		},

		addElement: function() {
			var selectedElementType = this.container.get( 'selectedElementType' );
			var element;

			if ( ! selectedElementType ) {
				return;
			}

			element = this.container.elements.create({
				type: selectedElementType
			});

			this.toggleAddingElement();
			this.setSelectedElementType();

			this.container.elements.toggleActive( element.get( 'id' ) );
		},

		deleteContainer: function() {
			torro.askConfirmation( this.options.i18n.confirmDeleteContainer, _.bind( function() {
				this.container.collection.remove( this.container );
			}, this ) );
		}
	});

	torro.Builder.ContainerView = ContainerView;

})( window.torro, window.jQuery, window._ );

( function( torro, $, _, fieldsAPI, dummyFieldManager ) {
	'use strict';

	function deepClone( input ) {
		var output = _.clone( input );

		_.each( output, function( value, key ) {
			var temp, i;

			if ( _.isArray( value ) ) {
				temp = [];

				for ( i = 0; i < value.length; i++ ) {
					if ( _.isObject( value[ i ] ) ) {
						temp.push( deepClone( value[ i ] ) );
					} else {
						temp.push( value[ i ] );
					}
				}

				output[ key ] = temp;
			} else if ( _.isObject( value ) ) {
				output[ key ] = deepClone( value );
			}
		});

		return output;
	}

	function parseFields( fields, element ) {
		var parsedFields = [];
		var hasLabel = false;

		_.each( fields, function( field ) {
			var parsedField;
			var elementChoices;
			var elementSetting;

			if ( _.isUndefined( field.type ) || _.isUndefined( dummyFieldManager.fields[ 'dummy_' + field.type ] ) ) {
				return;
			}

			parsedField = deepClone( dummyFieldManager.fields[ 'dummy_' + field.type ] );

			parsedField.section     = field.section;
			parsedField.label       = field.label;
			parsedField.description = field.description;
			parsedField['default']  = field['default'] || null;

			if ( field.is_choices ) {
				elementChoices = element.element_choices.where({
					field: _.isString( field.is_choices ) ? field.is_choices : '_main'
				});

				// TODO: Set ID and name for the repeatable choices field.
				return;
			}

			if ( field.is_label ) {

				// Only one label field is allowed.
				if ( hasLabel ) {
					return;
				}

				hasLabel = true;

				parsedField.id = 'torro_element_' + element.get( 'id' ) + '_label';
				parsedField.name = torro.getFieldName( element, 'label' );
				parsedField.currentValue = element.get( 'label' );
			} else {
				if ( field.repeatable ) {

					// Repeatable fields are currently not supported.
					return;
				}

				elementSetting = element.element_settings.findWhere({
					name: field.slug
				});

				if ( ! elementSetting ) {
					return;
				}

				parsedField.id = 'torro_element_' + element.get( 'id' ) + '_' + elementSetting.get( 'id' );
				parsedField.name = torro.getFieldName( elementSetting, 'value' );
				parsedField.currentValue = elementSetting.get( 'value' );
			}

			if ( parsedField.inputAttrs ) {
				parsedField.inputAttrs.id = parsedField.id;
				parsedField.inputAttrs.name = parsedField.name;

				if ( _.isArray( field.input_classes ) ) {
					parsedField.inputAttrs['class'] += ' ' + field.input_classes.join( ' ' );
				}

				if ( parsedField.description.length ) {
					parsedField.inputAttrs['aria-describedby'] = parsedField.id + '-description';
				}
			}

			if ( parsedField.labelAttrs ) {
				parsedField.labelAttrs.id = parsedField.id + '-label';
				parsedField.labelAttrs['for'] = parsedField.id;
			}

			if ( parsedField.wrapAttrs ) {
				parsedField.wrapAttrs.id = parsedField.id + '-wrap';
			}

			parsedFields.push( parsedField );
		});

		return parsedFields;
	}

	/**
	 * An element view.
	 *
	 * @class
	 *
	 * @param {torro.Builder.Element} element Element model.
	 * @param {object}                options View options.
	 */
	function ElementView( element, options ) {
		var id = element.get( 'id' );

		this.element = element;
		this.options = options || {};

		this.wrapTemplate = torro.template( 'element' );
		this.sectionTabTemplate = torro.template( 'element-section-tab' );
		this.sectionPanelTemplate = torro.template( 'element-section-panel' );
		this.fieldTemplate = torro.template( 'element-field' );

		this.$wrap = $( '<div />' );
		this.$wrap.attr( 'id', 'torro-element-' + id );
		this.$wrap.addClass( 'torro-element' );
	}

	_.extend( ElementView.prototype, {
		render: function() {
			var templateData            = this.element.attributes;
			templateData.type           = this.element.element_type.attributes;
			templateData.active         = this.element.collection.props.get( 'active' ).includes( this.element.get( 'id' ) );
			templateData.active_section = this.element.getActiveSection();

			this.$wrap.html( this.wrapTemplate( templateData ) );

			this.attach();

			this.initializeSections();
			this.initializeFields();
		},

		destroy: function() {
			this.deinitializeFields();
			this.deinitializeSections();

			this.detach();

			this.$wrap.remove();
		},

		initializeSections: function() {
			var $sectionTabsWrap   = this.$wrap.find( '.torro-element-content-tabs' );
			var $sectionPanelsWrap = this.$wrap.find( '.torro-element-content-panels' );

			var sections = this.element.element_type.getSections();
			var element = this.element;

			_.each( sections, _.bind( function( section ) {
				var templateData = _.clone( section );

				templateData.elementId = element.get( 'id' );
				templateData.active = element.getActiveSection() === templateData.slug;

				$sectionTabsWrap.append( this.sectionTabTemplate( templateData ) );
				$sectionPanelsWrap.append( this.sectionPanelTemplate( templateData ) );
			}, this ) );
		},

		deinitializeSections: function() {
			var $sectionTabsWrap   = this.$wrap.find( '.torro-element-content-tabs' );
			var $sectionPanelsWrap = this.$wrap.find( '.torro-element-content-panels' );

			$sectionTabsWrap.empty();
			$sectionPanelsWrap.empty();
		},

		initializeFields: function() {
			var fields = this.element.element_type.getFields();

			this.fieldManager = new fieldsAPI.FieldManager( parseFields( fields, this.element ), {
				instanceId: 'torro_element_' + this.element.get( 'id' )
			});
			this.fieldViews = [];

			_.each( this.fieldManager.models, _.bind( function( field ) {
				var viewClassName      = field.get( 'backboneView' );
				var FieldView          = fieldsAPI.FieldView;
				var $sectionFieldsWrap = this.$wrap.find( '#element-panel-' + this.element.get( 'id' ) + '-' + field.get( 'section' ) + ' > .torro-element-fields' );
				var view;

				if ( ! $sectionFieldsWrap.length ) {
					return;
				}

				$sectionFieldsWrap.append( this.fieldTemplate( field.attributes ) );

				if ( viewClassName && 'FieldView' !== viewClassName && fieldsAPI.FieldView[ viewClassName ] ) {
					FieldView = fieldsAPI.FieldView[ viewClassName ];
				}

				console.log( field.attributes );

				view = new FieldView({
					model: field
				});

				view.renderLabel();
				view.renderContent();

				this.fieldViews.push( view );
			}, this ) );
		},

		deinitializeFields: function() {
			_.each( this.fieldViews, function( fieldView ) {
				fieldView.remove();
			});

			this.$wrap.find( '.torro-element-fields' ).each( function() {
				$( this ).empty();
			});

			this.fieldViews = [];
			this.fieldManager = null;
		},

		attach: function() {
			this.element.on( 'remove', this.listenRemove, this );
			this.element.on( 'change:label', this.listenChangeLabel, this );
			this.element.on( 'change:type', this.listenChangeType, this );
			this.element.on( 'change:sort', this.listenChangeSort, this );
			this.element.on( 'changeElementType', this.listenChangeElementType, this );
			this.element.on( 'changeActiveSection', this.listenChangeActiveSection, this );
			this.element.collection.props.on( 'toggleActive', this.listenChangeActive, this );

			this.$wrap.on( 'click', '.torro-element-expand-button', _.bind( this.toggleActive, this ) );
			this.$wrap.on( 'click', '.delete-element-button', _.bind( this.deleteElement, this ) );
			this.$wrap.on( 'click', '.torro-element-content-tab', _.bind( this.changeActiveSection, this ) );

			// TODO: add jQuery hooks
		},

		detach: function() {
			this.element.collection.props.off( 'toggleActive', this.listenChangeActive, this );
			this.element.off( 'changeActiveSection', this.listenChangeActiveSection, this );
			this.element.off( 'changeElementType', this.listenChangeElementType, this );
			this.element.off( 'change:sort', this.listenChangeSort, this );
			this.element.off( 'change:type', this.listenChangeType, this );
			this.element.off( 'change:label', this.listenChangeLabel, this );
			this.element.off( 'remove', this.listenRemove, this );

			this.$wrap.off( 'click', '.torro-element-content-tab', _.bind( this.changeActiveSection, this ) );
			this.$wrap.off( 'click', '.delete-element-button', _.bind( this.deleteElement, this ) );
			this.$wrap.off( 'click', '.torro-element-expand-button', _.bind( this.toggleActive, this ) );

			// TODO: remove jQuery hooks
		},

		listenRemove: function() {
			var id = this.element.get( 'id' );

			if ( ! torro.isTempId( id ) ) {
				$( '#torro-deleted-wrap' ).append( '<input type="hidden" name="' + torro.getDeletedFieldName( this.element ) + '" value="' + id + '" />' );
			}

			this.destroy();
		},

		listenChangeLabel: function( element, label ) {
			var name = torro.escapeSelector( torro.getFieldName( this.element, 'label' ) );

			this.$wrap.find( 'input[name="' + name + '"]' ).val( label );
		},

		listenChangeType: function( element, type ) {
			var name = torro.escapeSelector( torro.getFieldName( this.element, 'type' ) );

			this.$wrap.find( 'input[name="' + name + '"]' ).val( type );
		},

		listenChangeSort: function( element, sort ) {
			var name = torro.escapeSelector( torro.getFieldName( this.element, 'sort' ) );

			this.$wrap.find( 'input[name="' + name + '"]' ).val( sort );
		},

		listenChangeElementType: function() {
			this.deinitializeFields();
			this.deinitializeSections();

			this.initializeSections();
			this.initializeFields();
		},

		listenChangeActiveSection: function( element, activeSection ) {
			var $button = this.$wrap.find( '.torro-element-content-tab[data-slug="' + activeSection + '"]' );

			this.$wrap.find( '.torro-element-content-tab' ).attr( 'aria-selected', 'false' );
			this.$wrap.find( '.torro-element-content-panel' ).attr( 'aria-hidden', 'true' );

			if ( $button.length ) {
				$button.attr( 'aria-selected', 'true' );
				this.$wrap.find( '#' + $button.attr( 'aria-controls' ) ).attr( 'aria-hidden', 'false' );
			}
		},

		listenChangeActive: function( props, active ) {
			if ( active.includes( this.element.get( 'id' ) ) ) {
				this.$wrap.find( '.torro-element-expand-button' ).attr( 'aria-expanded', 'true' ).find( '.screen-reader-text' ).text( this.options.i18n.hideContent );
				this.$wrap.find( '.torro-element-content' ).addClass( 'is-expanded' );
			} else {
				this.$wrap.find( '.torro-element-expand-button' ).attr( 'aria-expanded', 'false' ).find( '.screen-reader-text' ).text( this.options.i18n.showContent );
				this.$wrap.find( '.torro-element-content' ).removeClass( 'is-expanded' );
			}
		},

		toggleActive: function() {
			this.element.collection.toggleActive( this.element.get( 'id' ) );
		},

		deleteElement: function() {
			torro.askConfirmation( this.options.i18n.confirmDeleteElement, _.bind( function() {
				this.element.collection.remove( this.element );
			}, this ) );
		},

		changeActiveSection: function( e ) {
			var $button = $( e.target || e.delegateTarget );

			this.element.setActiveSection( $button.data( 'slug' ) );
		}
	});

	torro.Builder.ElementView = ElementView;

})( window.torro, window.jQuery, window._, window.pluginLibFieldsAPI, window.pluginLibFieldsAPIData.field_managers.torro_dummy_1 );

( function( torro, $, _ ) {
	'use strict';

	/**
	 * A form view.
	 *
	 * @class
	 *
	 * @param {jQuery}             $canvas Form canvas div.
	 * @param {torro.Builder.Form} form    Form model.
	 * @param {object}             options View options.
	 */
	function FormView( $canvas, form, options ) {
		this.form = form;
		this.options = options || {};

		this.canvasTemplate = torro.template( 'form-canvas' );

		this.$canvas = $canvas;
	}

	_.extend( FormView.prototype, {
		render: function() {
			var $deletedWrap, i;

			console.log( this.form );

			$deletedWrap = $( '<div />' );
			$deletedWrap.attr( 'id', 'torro-deleted-wrap' );
			$deletedWrap.css( 'display', 'none' );

			this.$canvas.html( this.canvasTemplate( this.form.attributes ) );
			this.$canvas.after( $deletedWrap );

			this.$addButton = this.$canvas.find( '.add-button' );
			this.$addPanel  = this.$canvas.find( '.add-panel' );

			this.checkHasContainers();

			for ( i = 0; i < this.form.containers.length; i++ ) {
				this.listenAddContainer( this.form.containers.at( i ) );
			}

			this.attach();
		},

		destroy: function() {
			this.detach();

			this.$canvas.empty();
		},

		attach: function() {
			this.form.containers.on( 'add', this.listenAddContainer, this );
			this.form.containers.on( 'add remove reset', this.checkHasContainers, this );

			this.$addButton.on( 'click', _.bind( this.addContainer, this ) );

			// TODO: add jQuery hooks
		},

		detach: function() {
			this.form.containers.off( 'add remove reset', _.bind( this.checkHasContainers, this ) );
			this.form.containers.off( 'add', this.listenAddContainer, this );

			this.$addButton.off( 'click', _.bind( this.addContainer, this ) );

			// TODO: remove jQuery hooks
		},

		listenAddContainer: function( container ) {
			var view = new torro.Builder.ContainerView( container, this.options );

			view.$tab.insertBefore( this.$addButton );
			view.$panel.insertBefore( this.$addPanel );
			this.$canvas.find( '.torro-form-canvas-footer' ).append( view.$footerPanel );

			view.render();
		},

		checkHasContainers: function() {
			if ( this.form.containers.length ) {
				this.$addButton.removeClass( 'is-active' );
				this.$addPanel.attr( 'aria-hidden', 'true' );
			} else {
				this.$addButton.addClass( 'is-active' );
				this.$addPanel.attr( 'aria-hidden', 'false' );
			}
		},

		addContainer: function() {
			this.form.containers.create();
		}
	});

	torro.Builder.FormView = FormView;

})( window.torro, window.jQuery, window._ );

( function( $ ) {
	'use strict';

	$( '.torro-metabox-tab' ).on( 'click', function( e ) {
		var $this = $( this );
		var $all  = $this.parent().children( '.torro-metabox-tab' );

		e.preventDefault();

		if ( 'true' === $this.attr( 'aria-selected' ) ) {
			return;
		}

		$all.each( function() {
			$( this ).attr( 'aria-selected', 'false' );
			$( $( this ).attr( 'href' ) ).attr( 'aria-hidden', 'true' );
		});

		$this.attr( 'aria-selected', 'true' );
		$( $this.attr( 'href' ) ).attr( 'aria-hidden', 'false' ).find( '.plugin-lib-map-control' ).each( function() {
			$( this ).wpMapPicker( 'refresh' );
		});
	});

})( window.jQuery );

( function( torroBuilder ) {
	'use strict';

	torroBuilder.getInstance();

})( window.torro.Builder );
