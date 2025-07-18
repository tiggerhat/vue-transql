<template>
  <a-form :model="formState" @finish="handleSubmit">
    <a-form-item label="Excel File" name="file">
      <a-upload
        v-model:fileList="fileList"
        :before-upload="beforeUpload"
        accept=".xlsx,.xls"
      >
        <a-button>
          <upload-outlined></upload-outlined>
          Click to Upload
        </a-button>
      </a-upload>
    </a-form-item>
    <a-form-item>
      <a-button type="primary" html-type="submit">Submit</a-button>
    </a-form-item>
  </a-form>
</template>

<script>
import { UploadOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

export default {
  components: {
    UploadOutlined,
  },
  data() {
    return {
      formState: {},
      fileList: [],
    };
  },
  methods: {
    beforeUpload(file) {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
      if (!isExcel) {
        message.error('You can only upload Excel files!');
      }
      return isExcel || false;
    },
    handleSubmit() {
      if (this.fileList.length === 0) {
        message.error('Please upload an Excel file!');
        return;
      }
      const formData = new FormData();
      formData.append('file', this.fileList[0]);
      // Handle file submission here (e.g., API call)
      message.success('File uploaded successfully!');
    },
  },
};
</script>

<style scoped></style>