<template>
  <div class="excel-column-mapper">
    <a-upload
      name="file"
      :multiple="false"
      :before-upload="beforeUpload"
      :show-upload-list="false"
    >
      <a-button type="primary">
        <upload-outlined></upload-outlined>
        Upload Excel File
      </a-button>
    </a-upload>

    <div v-if="excelData.length > 0" class="preview-section">
      <h3>Excel Data Preview</h3>
      <a-table :columns="previewColumns" :data-source="excelData" :pagination="false" />
    </div>

    <div v-if="excelData.length > 0" class="mapping-section">
      <h3>Map Columns to Database Fields</h3>
      <div v-for="(column, index) in excelColumns" :key="index" class="mapping-row">
        <span>{{ column }}</span>
        <a-select
          v-model:value="mappings[column]"
          style="width: 200px"
          placeholder="Select Database Field"
        >
          <a-select-option v-for="field in databaseFields" :key="field" :value="field">
            {{ field }}
          </a-select-option>
        </a-select>
      </div>
    </div>
  </div>
</template>

<script>
import { UploadOutlined } from '@ant-design/icons-vue';
import * as XLSX from 'xlsx';

export default {
  components: {
    UploadOutlined,
  },
  data() {
    return {
      excelData: [],
      excelColumns: [],
      previewColumns: [],
      databaseFields: ['id', 'name', 'email', 'created_at', 'updated_at'], // Example fields
      mappings: {},
    };
  },
  methods: {
    beforeUpload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        this.excelData = XLSX.utils.sheet_to_json(worksheet);
        this.excelColumns = Object.keys(this.excelData[0] || {});
        this.previewColumns = this.excelColumns.map((col) => ({
          title: col,
          dataIndex: col,
          key: col,
        }));
        this.mappings = {};
      };
      reader.readAsArrayBuffer(file);
      return false; // Prevent default upload behavior
    },
  },
};
</script>

<style scoped>
.excel-column-mapper {
  padding: 20px;
}
.preview-section,
.mapping-section {
  margin-top: 20px;
}
.mapping-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.mapping-row > span {
  margin-right: 10px;
  width: 150px;
}
</style>