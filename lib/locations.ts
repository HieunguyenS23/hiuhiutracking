export const locationTree = [
  {
    province: 'Hà Nội',
    districts: [
      { district: 'Cầu Giấy', wards: ['Dịch Vọng', 'Dịch Vọng Hậu', 'Mai Dịch', 'Nghĩa Đô'] },
      { district: 'Đống Đa', wards: ['Láng Hạ', 'Ô Chợ Dừa', 'Quang Trung', 'Thịnh Quang'] },
    ],
  },
  {
    province: 'Hồ Chí Minh',
    districts: [
      { district: 'Quận 1', wards: ['Bến Nghé', 'Bến Thành', 'Đa Kao', 'Nguyễn Thái Bình'] },
      { district: 'Thành phố Thủ Đức', wards: ['An Khánh', 'An Lợi Đông', 'Hiệp Bình Chánh', 'Linh Tây'] },
    ],
  },
  {
    province: 'Đà Nẵng',
    districts: [
      { district: 'Hải Châu', wards: ['Bình Hiên', 'Hòa Cường Bắc', 'Hòa Cường Nam', 'Thạch Thang'] },
      { district: 'Cẩm Lệ', wards: ['Hòa An', 'Hòa Phát', 'Khuê Trung', 'Hòa Xuân'] },
    ],
  },
] as const;
