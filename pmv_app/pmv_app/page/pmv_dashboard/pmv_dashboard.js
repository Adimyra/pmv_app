frappe.pages['pmv-dashboard'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'PMV Dashboard',
		single_column: true
	});

	new PMVDashboard(page);
}

class PMVDashboard {
	constructor(page) {
		this.page = page;
		this.make();
	}

	make() {
		this.render_body();
	}

	render_body() {
		this.page.main.html(`
			<div class="dashboard-container">
				<div class="dashboard-header">
					<h3>Data Processing Hub</h3>
					<p>Upload your financial documents to generate comprehensive reports.</p>
				</div>

				<div class="row">
					<!-- Main Processing Card -->
					<div class="col-md-8">
						<div class="custom-card">
							<div class="card-header-custom">
								<span><i class="fa fa-rocket mr-2 text-primary"></i> New Process Request</span>
							</div>
							<div class="card-body-custom">
								<div class="row">
									<!-- Left: Data Entry -->
									<div class="col-md-6 border-right">
										<div class="form-group">
											<label class="form-label-custom">Batch Process ID</label>
											<input type="text" id="batch-id" class="form-control form-control-custom" placeholder="Enter Batch ID">
										</div>
										<div class="form-group">
											<label class="form-label-custom">Date of Processing</label>
											<input type="date" id="processing-date" class="form-control form-control-custom">
										</div>
										<div class="form-group">
											<label class="form-label-custom">Description</label>
											<textarea id="description" class="form-control form-control-custom" rows="4" placeholder="Enter description..."></textarea>
										</div>
									</div>

									<!-- Right: File Upload -->
									<div class="col-md-6 pl-4">
										<div class="form-group">
											<label class="form-label-custom">Excel Source File</label>
											<div class="input-group">
												<input type="text" id="excel-file-path" class="form-control form-control-custom" placeholder="No file selected" readonly style="border-top-right-radius: 0; border-bottom-right-radius: 0;">
												<div class="input-group-append">
													<button class="btn btn-custom-secondary" id="upload-excel-btn" style="border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 0;">
														<i class="fa fa-upload"></i>
													</button>
												</div>
											</div>
										</div>
										<div class="form-group">
											<label class="form-label-custom">Supporting PDF</label>
											<div class="input-group">
												<input type="text" id="pdf-file-path" class="form-control form-control-custom" placeholder="No file selected" readonly style="border-top-right-radius: 0; border-bottom-right-radius: 0;">
												<div class="input-group-append">
													<button class="btn btn-custom-secondary" id="upload-pdf-btn" style="border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 0;">
														<i class="fa fa-upload"></i>
													</button>
												</div>
											</div>
										</div>
										
										<div class="mt-5">
											<button class="btn btn-custom-primary btn-block" id="process-btn" style="width: 100%;">
												<i class="fa fa-play mr-2"></i> Start Processing
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Activity Log Card -->
					<div class="col-md-4">
						<div class="custom-card h-100">
							<div class="card-header-custom">
								<span><i class="fa fa-history mr-2 text-warning"></i> Activity Log</span>
								<button class="btn btn-xs btn-custom-secondary" id="view-history-btn">
									View History <i class="fa fa-arrow-right ml-1"></i>
								</button>
							</div>
							<div class="card-body-custom p-0">
								<ul class="list-unstyled" id="activity-log-list" style="max-height: 450px; overflow-y: auto;">
									<li class="text-center empty-state p-5">
										<div class="text-muted">No recent activity</div>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		`);

		// Initialize state
		this.files = {
			excel: null,
			pdf: null
		};

		// Set default date to today
		this.page.main.find('#processing-date').val(frappe.datetime.get_today());

		// Bind events
		this.page.main.find('#upload-excel-btn').on('click', () => {
			this.open_file_uploader('excel');
		});

		this.page.main.find('#upload-pdf-btn').on('click', () => {
			this.open_file_uploader('pdf');
		});

		this.page.main.find('#process-btn').on('click', () => {
			this.process_files();
		});

		this.page.main.find('#view-history-btn').on('click', () => {
			frappe.set_route('pmv-history');
		});
	}

	open_file_uploader(type) {
		const allowMultiple = type === 'pdf';

		new frappe.ui.FileUploader({
			doctype: 'File',
			allow_multiple: allowMultiple,
			on_success: (file_doc) => {
				// If starting a new batch (both files were null), clear previous logs
				if (!this.files.excel && !this.files.pdf) {
					this.page.main.find('#activity-log-list').empty();
				}

				if (type === 'excel') {
					this.files.excel = file_doc.file_url;
					this.page.main.find('#excel-file-path').val(file_doc.file_name);
					this.add_log_item(`Uploaded ${file_doc.file_name} `, 'Just now', 'info', 'fa fa-upload');
				} else {
					// Handle multiple PDFs
					if (!this.files.pdf) this.files.pdf = [];

					// file_doc can be a single object or array depending on implementation, 
					// but usually on_success is called once per upload or with list.
					// Frappe FileUploader on_success arg depends on version. 
					// Assuming it returns the last uploaded file or we need to check if it's an array.
					// Standard FileUploader calls on_success for each file if multiple?
					// Let's assume we get one file_doc at a time or check.
					// Actually, standard FileUploader with allow_multiple might behave differently.
					// Let's assume we append to the list.

					// If file_doc is array (some versions)
					if (Array.isArray(file_doc)) {
						file_doc.forEach(f => this.files.pdf.push(f.file_url));
						const names = file_doc.map(f => f.file_name).join(', ');
						this.page.main.find('#pdf-file-path').val(`${this.files.pdf.length} files selected`);
						this.add_log_item(`Uploaded ${names} `, 'Just now', 'info', 'fa fa-upload');
					} else {
						this.files.pdf.push(file_doc.file_url);
						this.page.main.find('#pdf-file-path').val(`${this.files.pdf.length} files selected`);
						this.add_log_item(`Uploaded ${file_doc.file_name} `, 'Just now', 'info', 'fa fa-upload');
					}
				}

				frappe.show_alert({
					message: __('File uploaded successfully'),
					indicator: 'green'
				});
			}
		});
	}

	process_files() {
		const batchId = this.page.main.find('#batch-id').val();
		const processingDate = this.page.main.find('#processing-date').val();
		const description = this.page.main.find('#description').val();

		if (!batchId) {
			frappe.msgprint({
				title: __('Missing Information'),
				indicator: 'orange',
				message: __('Please enter a Batch Process ID.')
			});
			return;
		}

		if (!this.files.excel || !this.files.pdf) {
			frappe.msgprint({
				title: __('Missing Files'),
				indicator: 'orange',
				message: __('Please upload both an Excel file and a PDF file.')
			});
			return;
		}

		this.add_log_item('Processing started...', 'Just now', 'warning', 'fa fa-spinner fa-spin');
		frappe.show_progress('Processing', 0, 100, 'Starting...');

		// Call API directly with stored URLs
		frappe.call({
			method: 'pmv_app.pmv_app.api.process_files',
			args: {
				excel_file: this.files.excel,
				pdf_file: this.files.pdf,
				batch_id: batchId,
				processing_date: processingDate,
				description: description
			},
			freeze: true,
			freeze_message: 'Processing files...',
			callback: (r) => {
				frappe.show_progress('Processing', 100, 100, 'Done');
				setTimeout(() => frappe.hide_progress(), 500);

				if (r.message) {
					frappe.msgprint({
						title: __('Success'),
						indicator: 'green',
						message: __('Files processed successfully.')
					});

					// Add to log with download links
					const fileName = this.page.main.find('#excel-file-path').val();
					this.add_log_item(`Successfully processed ${fileName} `, 'Just now', 'success', 'fa fa-check', r.message.excel_url, r.message.pdf_url);

					// Handle downloads (auto-open)
					if (r.message.excel_url) {
						window.open(r.message.excel_url, '_blank');
					}
					if (r.message.pdf_url) {
						setTimeout(() => window.open(r.message.pdf_url, '_blank'), 1000);
					}

					// Clear inputs
					this.files = { excel: null, pdf: null };
					this.page.main.find('#excel-file-path').val('');
					this.page.main.find('#pdf-file-path').val('');

					// Clear batch details
					this.page.main.find('#batch-id').val('');
					this.page.main.find('#description').val('');
					// Reset date to today
					this.page.main.find('#processing-date').val(frappe.datetime.get_today());
				}
			},
			error: (r) => {
				frappe.hide_progress();
				console.error(r);
				this.add_log_item('Processing failed', 'Just now', 'danger', 'fa fa-times');
			}
		});
	}

	add_log_item(title, time, type = 'success', icon = 'fa fa-check', excelUrl = null, pdfUrl = null) {
		// Remove empty state if present
		this.page.main.find('.empty-state').remove();

		let actionsHtml = '';
		if (excelUrl || pdfUrl) {
			actionsHtml = `<div class="mt-2 pl-5 ml-2"> `;
			if (excelUrl) {
				actionsHtml += `<a href = "${excelUrl}" target = "_blank" class="btn btn-xs btn-custom-secondary mr-1"> <i class="fa fa-file-excel-o text-success"></i> Excel</a > `;
			}
			if (pdfUrl) {
				actionsHtml += `<a href = "${pdfUrl}" target = "_blank" class="btn btn-xs btn-custom-secondary"> <i class="fa fa-file-pdf-o text-danger"></i> PDF</a > `;
			}
			actionsHtml += `</div> `;
		}

		const logHtml = `
			<li class="activity-log-item">
				<div class="d-flex align-items-center">
					<div class="log-icon ${type}">
						<i class="${icon}"></i>
					</div>
					<div class="flex-grow-1">
						<h6 class="mb-0 text-dark" style="font-size: 0.95rem;">${title}</h6>
						<small class="text-muted">${time}</small>
					</div>
				</div>
				${actionsHtml}
            </li>
			`;
		$('#activity-log-list').prepend(logHtml);
	}
}