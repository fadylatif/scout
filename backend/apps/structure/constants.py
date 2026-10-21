"""
الهيكل الكشفي والإرشادي المعتمد لمجموعة القديس أبي سيفين
الترتيب من الأصغر إلى الأكبر، مع تحديد خصوصية الجنس للفرق.
"""

SCOUT_STAGES_HIERARCHY = [
    {
        'order': 1,
        'name': 'مرحلة السنافر',
        'short_name': 'سنافر',
        'description': 'المرحلة العمرية الأولى (ما قبل البراعم)',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق السنافر', 'gender': 'ANY'},
        ],
    },
    {
        'order': 2,
        'name': 'مرحلة البراعم',
        'short_name': 'براعم',
        'description': 'مرحلة البراعم الكشفية والإرشادية',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق البراعم', 'gender': 'ANY'},
        ],
    },
    {
        'order': 3,
        'name': 'مرحلة الأشبال والزهرات',
        'short_name': 'أشبال وزهرات',
        'description': 'المرحلة الابتدائية (أشبال أولاد فقط، وزهرات بنات فقط)',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق الأشبال', 'gender': 'M'},
            {'name': 'فريق الزهرات', 'gender': 'F'},
        ],
    },
    {
        'order': 4,
        'name': 'مرحلة الكشافة والمرشدات',
        'short_name': 'كشاف ومرشدات',
        'description': 'المرحلة الإعدادية (كشافة أولاد فقط، ومرشدات بنات فقط)',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق الكشافة', 'gender': 'M'},
            {'name': 'فريق المرشدات', 'gender': 'F'},
        ],
    },
    {
        'order': 5,
        'name': 'مرحلة المتقدم والرائدات',
        'short_name': 'متقدم ورائدات',
        'description': 'المرحلة الثانوية (كشاف متقدم أولاد فقط، ورائدات بنات فقط)',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق الكشاف المتقدم', 'gender': 'M'},
            {'name': 'فريق الرائدات', 'gender': 'F'},
        ],
    },
    {
        'order': 6,
        'name': 'مرحلة الجوالة والجوالات',
        'short_name': 'جوالة وجوالات',
        'description': 'المرحلة الجامعية (جوالة أولاد فقط، وجوالات بنات فقط)',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق الجوالة', 'gender': 'M'},
            {'name': 'فريق الجوالات', 'gender': 'F'},
        ],
    },
    {
        'order': 7,
        'name': 'مرحلة إعداد القادة',
        'short_name': 'إعداد قادة',
        'description': 'تأهيل وتدريب القادة الجدد',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق إعداد القادة', 'gender': 'ANY'},
        ],
    },
    {
        'order': 8,
        'name': 'مرحلة القادة',
        'short_name': 'قادة',
        'description': 'مجلس قيادة المجموعة',
        'allowed_genders': ['M', 'F'],
        'teams': [
            {'name': 'فريق القادة', 'gender': 'ANY'},
        ],
    },
]

# الكلمات المفتاحية للتحقق من توافق الجنس
BOYS_ONLY_KEYWORDS = ['اشبال', 'كشاف', 'متقدم', 'جواله']
GIRLS_ONLY_KEYWORDS = ['زهرات', 'مرشدات', 'رائدات', 'جوالات']


def validate_team_gender_compatibility(team_name: str, gender: str) -> tuple[bool, str]:
    """
    يفحص هل يتوافق جنس الفرد مع نوع الفريق.
    يرجع (True, '') في حال التوافق، أو (False, 'رسالة الخطأ') في حال التعارض.
    """
    if not team_name or not gender:
        return True, ''

    norm = team_name.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').strip()

    is_boys = any(kw in norm for kw in BOYS_ONLY_KEYWORDS)
    is_girls = any(kw in norm for kw in GIRLS_ONLY_KEYWORDS)

    if is_boys and gender in ('F', 'أنثى', 'انثى'):
        return False, f"فريق '{team_name}' مخصص للأولاد (ذكور) فقط ولا يقبل إناث."

    if is_girls and gender in ('M', 'ذكر'):
        return False, f"فريق '{team_name}' مخصص للبنات (إناث) فقط ولا يقبل ذكور."

    return True, ''
