import { __ } from "@wordpress/i18n";
import AjaxComponent from "./AjaxComponent";
import Container from "./Container";
import axios from "axios";

/**
 * Class for handling forms.
 *
 * @since 1.2.0
 */
class Form extends AjaxComponent {
	/**
	 * Constructor.
	 *
	 * @since 1.2.0
	 *
	 * @param {*} props Form properties.
	 */
	constructor(props) {
		super(props);

		this.id = parseInt(props.id);
		this.userId = parseInt(props.userId);
		this.wpNonce = torroFrontendI18n.wp_nonce;

		this.sliderId = 'torro-slider-' + this.id;
		this.sliderMargin = 0;

		this.key = this.createUserKey();

		this.status = 'progressing';
	}

	/**
	 * Doing things after component mounted.
	 *
	 * @since 1.2.0
	 */
	componentDidMount() {
		this.getForm();
		this.getContainers();
	}

	/**
	 * Get Form Data.
	 *
	 * @since 1.2.0
	 */
	getForm() {
		const formGetUrl = this.getEndpointUrl("/forms/" + this.id);

		axios
			.get(formGetUrl)
			.then(response => {
				this.setState({ form: response.data });
			})
			.catch(error => {
				console.error(error);
			});
	}

	/**
	 * Getting Containers.
	 *
	 * @since 1.2.0
	 */
	getContainers() {
		const containersGetUrl = this.getEndpointUrl("/containers?form_id=" + this.id);

		axios
			.get(containersGetUrl)
			.then(response => {
				let containers = response.data;

				containers.sort( function (a, b) {
					return a.sort-b.sort;
				});

				this.numContainer = containers.length;

				this.setState({ containers: containers });
			})
			.catch(error => {
				console.error(error);
			});
	}

	hasNextContainer(containerIndex) {
		if((containerIndex +1) >= this.numContainer ) {
			return false;
		}

		return true;
	}

	hasPrevContainer(containerIndex) {
		if(containerIndex <= 0 ) {
			return false;
		}

		return true;
	}

	nextContainer(event) {
		if( this.hasNextContainer(this.state.curContainer) ) {
			let curContainer = this.state.curContainer;
			curContainer += 1;

			this.setState({curContainer: curContainer});

			const sliderContent = event.target.closest('.slider-content');
			this.setSlider(sliderContent, 1 );
		}
	}

	prevContainer(event) {
		if( this.hasPrevContainer(this.state.curContainer) ) {
			let curContainer = this.state.curContainer;
			curContainer -= 1;

			this.setState({curContainer: curContainer});

			const sliderContent = event.target.closest('.slider-content');
			this.setSlider(sliderContent, -1 );
		}
	}

	setSlider(sliderContent, steps) {
		const margin = steps * 100;
		const margin_new = this.sliderMargin + margin;
		const sliderContentWidth = 100 * this.state.containers.length;

		if(margin_new < 0 || margin_new >= sliderContentWidth ) {
			return;
		}

		this.sliderMargin = margin_new;
		sliderContent.style.marginLeft = (-1 * this.sliderMargin.toString()) + '%';
	}

	/**
	 * Generating user key.
	 *
	 * @since 1.2.0
	 */
	createUserKey() {
		return Math.random()
			.toString(36)
			.substr(2, 9);
	}

	/**
	 * Saving data to rest API.
	 *
	 * @since 1.2.0
	 */
	createSubmission() {
		if (this.state.submissionId !== undefined) {
			return;
		}

		const submissionPostUrl = this.getEndpointUrl("/submissions");

		return axios.post(submissionPostUrl, {
			form_id: this.id,
			user_id: this.userId,
			key: this.createUserKey(),
			status: this.status
		});
	}

	/**
	 * Completing submission.
	 *
	 * @since 1.2.0
	 *
	 * @param event
	 */
	completeSubmission( event ){
		if (this.state.submissionId === undefined) {
			return;
		}

		this.status = 'completed';

		const submissionPutUrl = this.getEndpointUrl("/submissions") + '/' + this.state.submissionId;

		axios.put(submissionPutUrl, {
			form_id: this.id,
			user_id: this.userId,
			status: 'completed'
		}).then(response => {
			this.setState({
				containers: undefined,
				submissionId: undefined,
				curContainer: undefined
			});
		}).catch(error => {
			console.error((error));
		})
	}

	/**
	 * Setting submission id
	 *
	 * @since 1.2.0
	 *
	 * @param {*} id
	 */
	setSubmissionId(id) {
		this.setState({ submissionId: id });
	}

	/**
	 * Rendering content.
	 *
	 * @since 1.2.0
	 */
	renderComponent() {
		if( this.status === 'completed' ) {
			return this.renderSuccessMessage();
		}

		return this.renderForm();
	}

	/**
	 * Rendering Form.
	 *
	 * @since 1.2.0
	 *
	 * @returns {*}
	 */
	renderForm() {
		if (this.state.form === undefined || this.state.containers === undefined) {
			return this.showTextLoading();
		}

		const form = this.state.form.instance;

		let sliderContentWidth = this.state.containers.length * 100;
		let sliderContentStyle = {
			width: sliderContentWidth + '%'
		};

		return (
			<div className="torro-form">
				<h2>{form.title}</h2>
				<form id={form.id} className={form.form_attrs.class}>
					<div className="torro-slider">
						<div id={this.sliderId} className="slider-content" style={sliderContentStyle}>
							{this.renderContainers()}
						</div>
					</div>
				</form>
			</div>
		);
	}

	/**
	 * Prints out success message.
	 *
	 * @since 1.2.0
	 *
	 * @returns {*}
	 */
	renderSuccessMessage() {
		return (
			<div className="torro-notice torro-success-notice">
				<p>{this.state.form.instance.success_message}</p>
			</div>
		);
	}

	/**
	 * Rendering containers.
	 *
	 * @since 1.2.0
	 *
	 * @param {*} containers
	 */
	renderContainers() {
		const form = this.state.form.instance;

		return this.state.containers.map((container, i) => (
			<Container
				key={i}
				index={i}
				ajaxUrl={this.props.ajaxUrl}
				formId={this.id}
				submissionId={this.state.submissionId}
				setSubmissionId={this.setSubmissionId.bind(this)}
				wpNonce={this.wpNonce}
				showContainerTitle={form.show_container_title}
				requiredFieldsText={form.required_fields_text}
				previousButtonLabel={form.previous_button_label}
				nextButtonLabel={form.next_button_label}
				submitButtonLabel={form.submit_button_label}
				data={container}
				curContainer={this.state.curContainer}
				hasPrevContainer={this.hasPrevContainer(i)}
				hasNextContainer={this.hasNextContainer(i)}
				nextContainer={this.nextContainer.bind(this)}
				prevContainer={this.prevContainer.bind(this)}
				createSubmission={this.createSubmission.bind(this)}
				completeSubmission={this.completeSubmission.bind(this)}
			/>
		));
	}
}

export default Form;
