// doctor.js
async function loadPartials() {
  (function () {
    const sessionRaw = localStorage.getItem('session');
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;

    // ================== DATA (patients as single source of truth) ==================
    // Includes your new "birth" field (DOB). We also keep lastVisit/age etc.
    const PATIENTS = [
      { id: 'p-001', status: 'Confirmed', time: '12:00', name: 'Ionescu Maria',   birth: '1980-01-02', doctor: 'Dr. Popescu', service: 'General check-up', age: 45, condition: 'Hypertension',       lastVisit: '2025-07-22', doctorId: 'd-101' },
      { id: 'p-002', status: 'Arriving',  time: '13:00', name: 'Popa Mihai',      birth: '2000-03-04', doctor: 'Dr. Popescu', service: 'General check-up', age: 61, condition: 'Type 2 Diabetes',    lastVisit: '2025-06-05', doctorId: 'd-101' },
      { id: 'p-003', status: 'Confirmed', time: '11:00', name: 'Georgescu Elena', birth: '1984-12-25', doctor: 'Dr. Popescu', service: 'General check-up', age: 29, condition: 'Allergic Rhinitis', lastVisit: '2025-08-03', doctorId: 'd-101' },
      { id: 'p-004', status: 'Confirmed', time: '10:00', name: 'Tudor Andrei',    birth: '2001-10-02', doctor: 'Dr. Popescu', service: 'General check-up', age: 37, condition: 'Back Pain',         lastVisit: '2025-05-19', doctorId: 'd-999' },
    ];

    // Derive a tiny invoice list using patients as the source (so billing "uses patients table too")
    // In a real app, this would come from /api/invoices joined with /api/patients.
    const BASE_INVOICES = [
      { invoiceId: 'INV-1021', patientId: 'p-001', date: '2025-07-20', amount: 240, status: 'Paid' },
      { invoiceId: 'INV-1023', patientId: 'p-003', date: '2025-08-01', amount: 120, status: 'Due'  },
    ];

    // When user is a doctor, show only invoices for their patients
    function visiblePatients() {
      if (session && session.role === 'doctor') {
        return PATIENTS.filter(p => p.doctorId === session.uid);
      }
      return PATIENTS;
    }

    function visibleInvoices() {
      const pats = visiblePatients().map(p => p.id);
      const join = BASE_INVOICES
        .filter(inv => (session && session.role === 'doctor') ? pats.includes(inv.patientId) : true)
        .map(inv => {
          const pat = PATIENTS.find(p => p.id === inv.patientId);
          return {
            ...inv,
            patientName: pat ? pat.name : 'Unknown',
          };
        });
      return join;
    }

    // ================== doctor.html ==================
    function renderDoctorDashboard() {
      const tbody = document.getElementById('patientsTable');
      if (!tbody) return; // not on doctor.html

      const myPatients = visiblePatients();

      if (myPatients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-gray-400 p-2">No patients assigned yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      for (const p of myPatients) {
        const color =
          p.status === 'Confirmed' ? `rgba(110, 231, 183, 0.3)` :
          p.status === 'Arriving'  ? `rgba(252, 211, 77, 0.4)` :
                                     `rgba(253, 164, 175, 0.4)`;

        tbody.innerHTML += `<tr class="border-b border-gray-700">
          <td class="p-2">${p.time}</td>
          <td class="p-2">${p.name}</td>
          <td class="p-2">${p.doctor}</td>
          <td class="p-2">${p.service}</td>
          <td class="p-2">${p.age}</td>
          <td class="p-2">
            <span style="font-size:12px;padding:4px 8px;border-radius:999px;background:${color};">${p.status}</span>
          </td>
        </tr>`;
      }
    }

    // ================== patients.html ==================
    function renderPatientsPage() {
      const tbody = document.getElementById('patientsTbody');
      if (!tbody) return; // not on patients.html

      const filterInput = document.getElementById('patientFilter');

      // Normalize to match patients table columns
      const enriched = visiblePatients().map(p => ({
        ...p,
        phone: p.phone ?? '+40 7xx xxx xxx',
        notes: p.notes ?? p.condition ?? '',
      }));

      function paint(rows) {
        if (!rows || rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="py-3 px-3 text-gray-400">No patients found.</td></tr>`;
          return;
        }

        tbody.innerHTML = rows.map(p => `
          <tr class="border-t border-gray-700/60">
            <td class="py-2 px-3">${p.name}</td>
            <td class="py-2 px-3">${p.birth ?? '—'}</td>
            <td class="py-2 px-3">${p.phone}</td>
            <td class="py-2 px-3">${p.lastVisit ?? '—'}</td>
            <td class="py-2 px-3">${p.notes}</td>
            <td class="py-2 px-3 text-right">
              <a class="inline-flex items-center rounded-lg bg-gray-700/70 hover:bg-gray-700 px-3 py-1.5 text-sm" href="#">View</a>
              <a class="inline-flex items-center rounded-lg bg-gray-700/70 hover:bg-gray-700 px-3 py-1.5 text-sm ml-2" href="#">Edit</a>
            </td>
          </tr>
        `).join('');
      }

      paint(enriched);

      if (filterInput) {
        filterInput.addEventListener('input', e => {
          const q = e.target.value.toLowerCase().trim();
          const filtered = enriched.filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.phone || '').toLowerCase().includes(q)
          );
          paint(filtered);
        });
      }
    }

    // ================== billing.html ==================
    function renderBillingPage() {
      const tbody = document.getElementById('invoicesTbody');
      if (!tbody) return; // not on billing.html

      const search = document.getElementById('invoiceSearch');
      const invoices = visibleInvoices();

      function badge(status) {
        const cls =
          status === 'Paid' ? 'bg-emerald-500/20 text-emerald-300' :
          status === 'Due'  ? 'bg-amber-500/20 text-amber-300'  :
                              'bg-rose-500/20 text-rose-300';
        return `<span class="px-2 py-1 rounded-full text-xs ${cls}">${status}</span>`;
      }

      function paint(rows) {
        if (!rows || rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="py-3 px-3 text-gray-400">No invoices found.</td></tr>`;
          return;
        }

        tbody.innerHTML = rows.map(inv => `
          <tr class="border-t border-gray-700/60">
            <td class="py-2 px-3">#${inv.invoiceId}</td>
            <td class="py-2 px-3">${inv.patientName}</td>
            <td class="py-2 px-3">${inv.date}</td>
            <td class="py-2 px-3">€ ${inv.amount}</td>
            <td class="py-2 px-3">${badge(inv.status)}</td>
            <td class="py-2 px-3 text-right">
              ${inv.status === 'Due'
                ? `<a class="inline-flex items-center rounded-lg bg-gray-700/70 hover:bg-gray-700 px-3 py-1.5 text-sm" href="#">Send</a>`
                : `<a class="inline-flex items-center rounded-lg bg-gray-700/70 hover:bg-gray-700 px-3 py-1.5 text-sm" href="#">View</a>`
              }
            </td>
          </tr>
        `).join('');
      }

      paint(invoices);

      if (search) {
        search.addEventListener('input', e => {
          const q = e.target.value.toLowerCase().trim();
          const filtered = invoices.filter(inv =>
            inv.invoiceId.toLowerCase().includes(q) ||
            (inv.patientName || '').toLowerCase().includes(q) ||
            (inv.status || '').toLowerCase().includes(q)
          );
          paint(filtered);
        });
      }
    }

    // ================== boot: run renderers for whichever page is open ==================
    renderDoctorDashboard();
    renderPatientsPage();
    renderBillingPage();

  })();
}

document.addEventListener('DOMContentLoaded', loadPartials);
