// بيانات الطلاب المسجلين مع Firebase
// ==========================
// الإعدادات وقاعدة البيانات
// ==========================

// تعريف الأفواج المتاحة
const FOUJ_OPTIONS = [
    { key: "f1_mat", name: "الفوج الأول (متوسط)", location: "متوسطة", schedule: "8-10" },
    { key: "f2_mat", name: "الفوج الثاني (متوسط)", location: "متوسطة", schedule: "10-12" },
    { key: "f1_ibt", name: "الفوج الأول (ابتدائي)", location: "ابتدائية", schedule: "14-16" },
];

let registeredStudents = JSON.parse(localStorage.getItem('registeredStudents')) || [];
let currentEditingStudentUID = null;
let selectedFouj = null;

// ==========================
// دوال التنبيه والنوافذ
// ==========================

function showAlert(message, type = 'info') {
    const customAlert = document.getElementById('customAlert');
    customAlert.textContent = message;
    customAlert.className = 'custom-alert'; // Reset classes
    customAlert.classList.add(type); // 'success', 'error', 'warning'
    
    customAlert.style.display = 'block';
    setTimeout(() => {
        customAlert.style.display = 'none';
    }, 3000);
}

function showConfirmation(message, onConfirm) {
    document.getElementById('confirmationMessage').textContent = message;
    const confirmModal = document.getElementById('confirmationModal');
    confirmModal.style.display = 'flex';

    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    confirmBtn.onclick = () => {
        onConfirm();
        confirmModal.style.display = 'none';
    };
    cancelBtn.onclick = () => {
        confirmModal.style.display = 'none';
    };
}

// ==========================
// دوال إدارة الطلاب
// ==========================

function saveStudents() {
    localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));
}

function generateUID() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function findStudentByUID(uid) {
    return registeredStudents.find(student => student.uid === uid);
}

function renderStudents() {
    const studentList = document.getElementById('studentList');
    studentList.innerHTML = '';
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    const filteredStudents = registeredStudents.filter(student =>
        student.firstName.toLowerCase().includes(searchTerm) ||
        student.lastName.toLowerCase().includes(searchTerm) ||
        student.parentPhone.includes(searchTerm)
    );

    filteredStudents.forEach((student, index) => {
        const fouj = FOUJ_OPTIONS.find(f => f.location === student.location && f.schedule === student.schedule);
        const foujName = fouj ? fouj.name : "غير محدد";
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${student.firstName} ${student.lastName}</td>
                <td>${student.dob}</td>
                <td>${student.grade}</td>
                <td>${student.parentPhone}</td>
                <td>${foujName}</td>
                <td class="actions">
                    <button class="btn-edit" onclick="openEditModal('${student.uid}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteStudent('${student.uid}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>
        `;
        studentList.innerHTML += row;
    });
    
    document.getElementById('studentCount').textContent = `عدد التلاميذ المسجلين: ${filteredStudents.length}`;
}

// ==========================
// دوال التسجيل
// ==========================

function showFoujChoiceModal() {
    const foujList = document.getElementById('foujList');
    foujList.innerHTML = '';
    FOUJ_OPTIONS.forEach(opt => {
        foujList.innerHTML += `
            <label class="radio-label">
                <input required type="radio" name="chosenFouj" value="${opt.key}">
                ${opt.name} (${opt.schedule})
            </label>
        `;
    });
    document.getElementById('foujChoiceModal').style.display = 'flex';
}

function closeFoujChoiceModal() {
    document.getElementById('foujChoiceModal').style.display = 'none';
}

function openRegistrationModal() {
    document.getElementById('registrationModal').style.display = 'flex';
}

function closeRegistrationModal() {
    document.getElementById('studentForm').reset();
    document.getElementById('registrationModal').style.display = 'none';
}


// ==========================
// دوال التعديل وتغيير الفوج
// ==========================

function openEditModal(uid) {
    const student = findStudentByUID(uid);
    if (!student) return;

    currentEditingStudentUID = uid;
    document.getElementById('editStudentUID').value = student.uid;
    document.getElementById('editFirstName').value = student.firstName;
    document.getElementById('editLastName').value = student.lastName;
    document.getElementById('editDob').value = student.dob;
    document.getElementById('editGrade').value = student.grade;
    document.getElementById('editParentPhone').value = student.parentPhone;

    // Set hidden inputs for current fouj
    document.querySelector('input[name="editLocation"]').value = student.location;
    document.querySelector('input[name="editSchedule"]').value = student.schedule;

    document.getElementById('editStudentModal').style.display = 'flex';
}

function closeEditModal() {
    currentEditingStudentUID = null;
    document.getElementById('editStudentModal').style.display = 'none';
}

function showEditFoujChangeModal() {
    const foujChoices = document.getElementById('editFoujChoicesList');
    foujChoices.innerHTML = ''; // Clear previous choices

    const student = findStudentByUID(currentEditingStudentUID);
    
    FOUJ_OPTIONS.forEach(opt => {
        const isCurrentFouj = (student && student.schedule === opt.schedule && student.location === opt.location);
        
        foujChoices.innerHTML += `
            <label class="radio-label ${isCurrentFouj ? 'selected' : ''}">
                <input required type="radio" name="chosenEditFouj" value="${opt.key}" ${isCurrentFouj ? 'checked' : ''}>
                ${opt.name} (${opt.schedule})
            </label>
        `;
    });

    document.getElementById('editFoujChangeModal').style.display = 'flex';
}

function closeEditFoujChangeModal() {
    document.getElementById('editFoujChangeModal').style.display = 'none';
}


// ==========================
// معالجات الأحداث
// ==========================
document.addEventListener('DOMContentLoaded', function() {
    
    // Initial render
    renderStudents();
    
    // Handle Fouj Choice
    const foujChoiceForm = document.getElementById('foujChoiceForm');
    if(foujChoiceForm) {
        foujChoiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const chosenFoujKey = document.querySelector('input[name="chosenFouj"]:checked').value;
            selectedFouj = FOUJ_OPTIONS.find(f => f.key === chosenFoujKey);
            closeFoujChoiceModal();
            openRegistrationModal();
        });
    }

    // Handle New Student Registration
    const studentForm = document.getElementById('studentForm');
    if(studentForm) {
        studentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newStudent = {
                uid: generateUID(),
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                dob: document.getElementById('dob').value,
                grade: document.getElementById('grade').value,
                parentPhone: document.getElementById('parentPhone').value,
                location: selectedFouj.location,
                schedule: selectedFouj.schedule,
                registrationDate: new Date().toISOString()
            };

            registeredStudents.push(newStudent);
            saveStudents();
            renderStudents();
            closeRegistrationModal();
            showAlert('✅ تم تسجيل الطالب بنجاح!', 'success');
        });
    }

    // Handle Student Edit
    const editStudentForm = document.getElementById('editStudentForm');
    if(editStudentForm) {
        editStudentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const studentIndex = registeredStudents.findIndex(s => s.uid === currentEditingStudentUID);
            if (studentIndex > -1) {
                registeredStudents[studentIndex].firstName = document.getElementById('editFirstName').value;
                registeredStudents[studentIndex].lastName = document.getElementById('editLastName').value;
                registeredStudents[studentIndex].dob = document.getElementById('editDob').value;
                registeredStudents[studentIndex].grade = document.getElementById('editGrade').value;
                registeredStudents[studentIndex].parentPhone = document.getElementById('editParentPhone').value;
                
                // Location and schedule are updated by the change fouj modal
                // They are saved here along with other data
                
                saveStudents();
                renderStudents();
                closeEditModal();
                showAlert('✅ تم تحديث بيانات الطالب بنجاح!', 'success');
            } else {
                 showAlert('❌ خطأ: لم يتم العثور على الطالب.', 'error');
            }
        });
    }
    
    // Handle Fouj Change during Edit
    const editChangeFoujForm = document.getElementById('editChangeFoujForm');
    if (editChangeFoujForm) {
        editChangeFoujForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const chosenFoujKey = document.querySelector('input[name="chosenEditFouj"]:checked');
            
            if (!chosenFoujKey) {
                showAlert('⚠️ الرجاء اختيار فوج جديد.', 'warning');
                return;
            }

            const fouj = FOUJ_OPTIONS.find(f => f.key === chosenFoujKey.value);
            if (fouj && currentEditingStudentUID) {
                const studentIndex = registeredStudents.findIndex(s => s.uid === currentEditingStudentUID);
                if (studentIndex > -1) {
                    // Update student data directly
                    registeredStudents[studentIndex].location = fouj.location;
                    registeredStudents[studentIndex].schedule = fouj.schedule;
                    
                    showAlert(`✅ تم تغيير الفوج بنجاح إلى: ${fouj.name}`, 'success');
                    closeEditFoujChangeModal();
                }
            }
        });
    }
});

function deleteStudent(uid) {
    showConfirmation('هل أنت متأكد من أنك تريد حذف هذا الطالب؟', () => {
        registeredStudents = registeredStudents.filter(student => student.uid !== uid);
        saveStudents();
        renderStudents();
        showAlert('🗑️ تم حذف الطالب بنجاح.', 'info');
    });
}

function filterStudents() {
    renderStudents();
}

function exportToExcel() {
    if (registeredStudents.length === 0) {
        showAlert('⚠️ لا يوجد طلاب لتصديرهم.', 'warning');
        return;
    }

    const dataToExport = registeredStudents.map((student, index) => {
        const fouj = FOUJ_OPTIONS.find(f => f.location === student.location && f.schedule === student.schedule);
        return {
            'الرقم': index + 1,
            'الاسم': student.firstName,
            'اللقب': student.lastName,
            'تاريخ الميلاد': student.dob,
            'المستوى الدراسي': student.grade,
            'هاتف ولي الأمر': student.parentPhone,
            'الفوج': fouj ? fouj.name : 'غير محدد'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة التلاميذ');
    XLSX.writeFile(workbook, 'قائمة_التلاميذ.xlsx');
    showAlert('🚀 تم تصدير الملف بنجاح!', 'success');
}


// ==========================
// تصدير الدوال للاستخدام في HTML
// ==========================
window.showFoujChoiceModal = showFoujChoiceModal;
window.closeFoujChoiceModal = closeFoujChoiceModal;
window.closeRegistrationModal = closeRegistrationModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteStudent = deleteStudent;
window.filterStudents = filterStudents;
window.exportToExcel = exportToExcel;
window.showEditFoujChangeModal = showEditFoujChangeModal;
window.closeEditFoujChangeModal = closeEditFoujChangeModal;
