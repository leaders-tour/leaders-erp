import { gql } from '@apollo/client';
import { useCrudResource } from '../../lib/crud';

const LIST = gql`
  query SafetyNotices {
    safetyNotices {
      id
      title
      contentMd
      imageUrls
      createdAt
      updatedAt
    }
  }
`;

const CREATE = gql`
  mutation CreateSafetyNotice($input: SafetyNoticeCreateInput!) {
    createSafetyNotice(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdateSafetyNotice($id: ID!, $input: SafetyNoticeUpdateInput!) {
    updateSafetyNotice(id: $id, input: $input) {
      id
    }
  }
`;

const REMOVE = gql`
  mutation DeleteSafetyNotice($id: ID!) {
    deleteSafetyNotice(id: $id)
  }
`;

export interface SafetyNoticeRow {
  id: string;
  title: string;
  contentMd: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SafetyNoticeFormInput {
  title: string;
  contentMd: string;
}

export function useSafetyNoticeCrud() {
  return useCrudResource<SafetyNoticeRow, SafetyNoticeFormInput, SafetyNoticeFormInput>({
    docs: { list: LIST, create: CREATE, update: UPDATE, remove: REMOVE },
    keys: {
      listKey: 'safetyNotices',
      createKey: 'createSafetyNotice',
      updateKey: 'updateSafetyNotice',
      removeKey: 'deleteSafetyNotice',
    },
    toCreateVariables: (input) => ({
      input: {
        title: input.title.trim(),
        contentMd: input.contentMd.trim(),
      },
    }),
    toUpdateVariables: (id, input) => ({
      id,
      input: {
        title: input.title.trim(),
        contentMd: input.contentMd.trim(),
      },
    }),
  });
}
