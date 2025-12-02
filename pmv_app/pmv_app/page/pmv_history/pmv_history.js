frappe.pages['pmv-history'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Processing History',
        single_column: true
    });

    // Load CSS
    frappe.require('pmv_history.css');

    // Add back button
    page.set_secondary_action('Back to Dashboard', () => {
        frappe.set_route('pmv-dashboard');
    });

    // Add refresh button
    page.set_primary_action('Refresh', () => {
        render_history(page);
    }, 'fa fa-refresh');

    // Initialize state
    page.current_view = 'list'; // 'list' or 'card'

    render_history(page);
}

function render_history(page) {
    // Fetch logs
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'PMV Process Log',
            fields: ['name', 'batch_id', 'processing_date', 'description', 'status', 'output_excel', 'output_pdf', 'creation'],
            order_by: 'creation desc',
            limit_page_length: 50
        },
        callback: function (r) {
            if (r.message) {
                const logs = r.message;
                render_content(page, logs);
            }
        }
    });
}

function render_content(page, logs) {
    const isList = page.current_view === 'list';

    let html = `
		<div class="history-container">
			<div class="view-toggle-container">
				<button class="view-toggle-btn ${isList ? 'active' : ''}" onclick="toggle_view(this, 'list')">
					<i class="fa fa-list"></i> List
				</button>
				<button class="view-toggle-btn ${!isList ? 'active' : ''}" onclick="toggle_view(this, 'card')">
					<i class="fa fa-th-large"></i> Card
				</button>
			</div>
			
			<div class="history-content ${isList ? 'view-list' : 'view-card'}" id="history-content">
	`;

    if (logs.length === 0) {
        html += `
			<div class="empty-state">
				<i class="fa fa-folder-open-o"></i>
				<h4>No History Found</h4>
				<p>Processed files will appear here.</p>
			</div>
		`;
    } else {
        logs.forEach(log => {
            const statusClass = log.status === 'Success' ? 'success' :
                log.status === 'Failed' ? 'failed' : 'processing';

            let actions = '';
            if (log.status === 'Success') {
                if (log.output_excel) {
                    actions += `
						<a href="${log.output_excel}" target="_blank" class="action-btn excel" title="Download Excel">
							<i class="fa fa-file-excel-o"></i> Excel
						</a>
					`;
                }
                if (log.output_pdf) {
                    actions += `
						<a href="${log.output_pdf}" target="_blank" class="action-btn pdf" title="Download PDF">
							<i class="fa fa-file-pdf-o"></i> PDF
						</a>
					`;
                }
            }

            html += `
				<div class="history-item">
					<div class="history-item-header">
						<div class="batch-id">${log.batch_id}</div>
						<span class="status-badge ${statusClass}">${log.status}</span>
					</div>
					<div class="history-item-body">
						${log.description || 'No description provided.'}
					</div>
					<div class="history-item-meta">
						<div title="Processing Date"><i class="fa fa-calendar"></i> ${frappe.datetime.str_to_user(log.processing_date)}</div>
						<div title="Created"><i class="fa fa-clock-o"></i> ${frappe.datetime.comment_when(log.creation)}</div>
					</div>
					<div class="history-item-actions">
						${actions}
					</div>
				</div>
			`;
        });
    }

    html += `
			</div>
		</div>
	`;

    $(page.body).html(html);

    // Attach toggle function to window so onclick works (or better, bind it here)
    // Since we are replacing HTML, simple inline onclick is easiest if we expose the function, 
    // but cleaner to bind after render. Let's bind after render.
    $(page.body).find('.view-toggle-btn').off('click').on('click', function () {
        const mode = $(this).text().trim().toLowerCase();
        page.current_view = mode;
        render_content(page, logs);
    });
}
