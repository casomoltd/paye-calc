import {PensionBasis} from '../../../../src/types';
import type {Scenario} from '../../../scenario';
import {AUTO_ENROLMENT} from './auto-enrolment';
import {EMPLOYER} from './employer';
import {NO_PENSION} from './no-pension';
import {PERSONAL} from './personal';
import {SALARY_SACRIFICE} from './salary-sacrifice';

/** The tables by pension basis. */
export const REST_OF_UK: Readonly<Record<PensionBasis, readonly Scenario[]>> = {
  [PensionBasis.None]: NO_PENSION,
  [PensionBasis.AutoEnrolment]: AUTO_ENROLMENT,
  [PensionBasis.Employer]: EMPLOYER,
  [PensionBasis.SalarySacrifice]: SALARY_SACRIFICE,
  [PensionBasis.Personal]: PERSONAL,
};
