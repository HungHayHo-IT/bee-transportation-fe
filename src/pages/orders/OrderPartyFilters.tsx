import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Autocomplete, MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionAction } from '@/constants/permissions';
import { fetchDepartments, fetchUsers } from '@/services/organisationService';
import { fetchCustomerDetail, searchCustomers } from '@/services/customerService';
import type { Customer } from '@/types/customer';
import type { Department, OrganisationUser } from '@/types/organisation';
import { ALL_OPTION } from './orderFilterValues';
import { customerDisplayName } from '@/utils/customerName';

export interface OrderPartyFiltersValue {
  departmentId: string;
  assigneeId: string;
  customerId: string;
}

export interface OrderPartyFiltersProps {
  values: OrderPartyFiltersValue;
  onChange: (patch: Partial<OrderPartyFiltersValue>) => void;
}

/**
 * The three "who" filters F5 asks for: department, the person handling the order,
 * and the customer. They live apart from the filter bar because each needs its own
 * catalogue call, and the customer list is far too long for a plain select.
 */
export function OrderPartyFilters({ values, onChange }: OrderPartyFiltersProps): ReactNode {
  const { t } = useTranslation();
  const { can } = usePermissions();
  // Only these roles may read the staff directory, so the assignee filter is theirs
  // alone; the others get a bar without it rather than one that errors on open.
  const canPickAssignee = can(PermissionAction.ViewStaffDirectory);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<OrganisationUser[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const debouncedQuery = useDebouncedValue(customerQuery);

  useEffect(() => {
    let isCurrent = true;
    fetchDepartments()
      .then((rows) => {
        if (isCurrent) setDepartments(rows.filter((row) => row.isActive));
      })
      .catch(() => {
        if (isCurrent) setDepartments([]);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Narrowing to the chosen department keeps the list short and the pair coherent;
  // a manager is served their own department either way.
  const departmentId = values.departmentId === ALL_OPTION ? undefined : Number(values.departmentId);
  useEffect(() => {
    if (!canPickAssignee) return;
    let isCurrent = true;
    fetchUsers({ departmentId, isActive: true, limit: 200 })
      .then((page) => {
        if (isCurrent) setStaff(page.items);
      })
      .catch(() => {
        if (isCurrent) setStaff([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [canPickAssignee, departmentId]);

  // The URL carries only the id, so a filtered link opened fresh has to look the
  // name up before the box can show anything but a blank.
  useEffect(() => {
    if (values.customerId === '') {
      setCustomer(null);
      return;
    }
    if (customer !== null && String(customer.id) === values.customerId) return;
    let isCurrent = true;
    fetchCustomerDetail(Number(values.customerId))
      .then((found) => {
        if (isCurrent) setCustomer(found);
      })
      .catch(() => {
        if (isCurrent) setCustomer(null);
      });
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.customerId]);

  useEffect(() => {
    let isCurrent = true;
    searchCustomers(debouncedQuery)
      .then((kq) => {
        if (isCurrent) setCustomerOptions(kq.items);
      })
      .catch(() => {
        if (isCurrent) setCustomerOptions([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  // Rendered as siblings (not wrapped) so the parent filter grid lays every field
  // out on the same column rhythm; each field simply fills its own grid cell.
  return (
    <Fragment>
      <TextField
        select
        fullWidth
        label={t('orders.list.department')}
        value={values.departmentId}
        // Changing department invalidates the person picked from the old one.
        onChange={(event) =>
          onChange({ departmentId: event.target.value, assigneeId: ALL_OPTION })
        }
      >
        <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
        {departments.map((department) => (
          <MenuItem key={department.id} value={String(department.id)}>
            {department.name}
          </MenuItem>
        ))}
      </TextField>

      {!canPickAssignee ? null : (
        <TextField
          select
          fullWidth
          label={t('orders.list.assignee')}
          value={values.assigneeId}
          onChange={(event) => onChange({ assigneeId: event.target.value })}
        >
          <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
          {staff.map((person) => (
            <MenuItem key={person.id} value={String(person.id)}>
              {person.fullName}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Autocomplete
        options={customerOptions}
        value={customer}
        fullWidth
        getOptionLabel={(option) => customerDisplayName(option) ?? ''}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        onInputChange={(_, next) => setCustomerQuery(next)}
        onChange={(_, next) => {
          setCustomer(next);
          onChange({ customerId: next === null ? '' : String(next.id) });
        }}
        renderInput={(params) => <TextField {...params} label={t('orders.list.customer')} />}
      />
    </Fragment>
  );
}
